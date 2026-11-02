-- AI check before a card is published or edited (Gemini on the server).
-- Run once in the SQL Editor, AFTER the app version with /api/cards is live on Vercel:
-- from this point on the old app version cannot create cards.
--
-- How it works: the app no longer writes cards itself. It uploads the files to its own
-- folder in card-files and sends the card to /api/cards (Vercel). The server checks the
-- topics and the files with Gemini and writes the card with the service role key:
--   * allowed            -> the card is published (status 'active') / the edit is saved;
--   * not allowed        -> nothing is written, the student sees the reason;
--   * the AI cannot answer (error, timeout, limit) -> the card is written with the new
--     status 'pending': hidden from everyone but the author until an administrator
--     approves it (admin_approve_card) or deletes it (admin_delete_card).
--
-- 1. barter_posts.status also accepts 'pending'.
-- 2. Students cannot insert cards or file rows, or change topics, directly any more
--    (otherwise the check could be skipped with a hand-made request). Deleting stays.
-- 3. set_my_card_status: a pending card cannot be switched on by its author.
-- 4. admin_approve_card(id): an administrator publishes a pending card.
-- 5. Limit: at most 10 AI checks per student per hour (ai_checks + take_ai_check, server only).
-- 6. Administrators see the files of every card: admin_list_cards returns them, and
--    they may open them in Storage (signed links).

-- 1 -------------------------------------------------------------------------
alter table public.barter_posts drop constraint if exists check_status_valid;
alter table public.barter_posts add constraint check_status_valid
  check (status in ('active', 'completed', 'archived', 'pending'));

-- 2 -------------------------------------------------------------------------
drop policy if exists students_create_own_posts on public.barter_posts;
revoke insert (author_id, needed_subject_id, offered_subject_id, description, offered_description, contact_method, status)
  on public.barter_posts from authenticated;
revoke insert on public.barter_posts from authenticated;

-- Topics change only through the server (it checks them first).
revoke execute on function public.update_my_card(uuid, text, text) from public, anon, authenticated;

-- File rows are added only by the server, after the check. Students still remove their own.
drop policy if exists card_files_insert_own on public.card_files;
revoke insert on public.card_files from authenticated;

-- 3 -------------------------------------------------------------------------
create or replace function public.set_my_card_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('active', 'archived') then
    raise exception 'A card can only be set to active or archived' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.barter_posts
    where id = p_id and author_id = private.current_user_id() and status = 'pending'
  ) then
    raise exception 'This card is waiting for a moderator' using errcode = 'check_violation';
  end if;
  update public.barter_posts
  set status = p_status
  where id = p_id and author_id = private.current_user_id() and status <> 'pending';
end;
$$;

-- 4 -------------------------------------------------------------------------
create or replace function public.admin_approve_card(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Only administrators can approve cards' using errcode = 'insufficient_privilege';
  end if;
  update public.barter_posts set status = 'active' where id = p_id and status = 'pending';
  if not found then
    raise exception 'This card is no longer waiting for a check' using errcode = 'no_data_found';
  end if;
end;
$$;
revoke execute on function public.admin_approve_card(uuid) from public, anon;
grant execute on function public.admin_approve_card(uuid) to authenticated;

-- 5 -------------------------------------------------------------------------
-- One row per AI check (only the time): the server counts them before asking Gemini, so
-- nobody can use up the Gemini quota (or money on a paid key) by pressing Publish again
-- and again. Rows older than a day are removed on the next check.
create table if not exists public.ai_checks (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.users (id) on delete cascade,
  checked_at timestamptz not null default now()
);
comment on table public.ai_checks is 'Times of AI checks per student, for the hourly limit (take_ai_check). Server only.';
create index if not exists ai_checks_user_time_idx on public.ai_checks (user_id, checked_at desc);
alter table public.ai_checks enable row level security;
revoke all on public.ai_checks from anon, authenticated;

-- 0: allowed, and counted. Otherwise: seconds until the student may check again.
create or replace function public.take_ai_check(
  p_user uuid,
  p_limit integer default 10,
  p_window interval default interval '1 hour'
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count  integer;
  v_oldest timestamptz;
begin
  -- Two requests of the same student at once are counted one after the other.
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));
  delete from public.ai_checks where user_id = p_user and checked_at < now() - interval '1 day';
  select count(*), min(checked_at) into v_count, v_oldest
  from public.ai_checks
  where user_id = p_user and checked_at > now() - p_window;
  if v_count >= p_limit then
    return greatest(1, ceil(extract(epoch from (v_oldest + p_window - now())))::integer);
  end if;
  insert into public.ai_checks (user_id) values (p_user);
  return 0;
end;
$$;
revoke execute on function public.take_ai_check(uuid, integer, interval) from public, anon, authenticated;
grant execute on function public.take_ai_check(uuid, integer, interval) to service_role;

-- 6 -------------------------------------------------------------------------
-- The result gets a new column (files), so the function is replaced, not changed.
drop function if exists public.admin_list_cards();
create function public.admin_list_cards()
returns table (
  id uuid,
  created_at timestamptz,
  status text,
  needed_name text,
  needed_category text,
  offered_name text,
  offered_category text,
  description text,
  offered_description text,
  author_id uuid,
  author_name text,
  author_email text,
  file_count integer,
  files jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Only administrators can open this page' using errcode = 'insufficient_privilege';
  end if;
  return query
    select b.id, b.created_at, b.status::text,
           ns.name::text, ns.category::text, os.name::text, os.category::text,
           b.description, b.offered_description,
           u.id, u.full_name::text, u.email::text,
           (select count(*)::integer from public.card_files f where f.post_id = b.id),
           (select coalesce(jsonb_agg(jsonb_build_object(
                     'id', f.id, 'path', f.path, 'name', f.name, 'kind', f.kind, 'created_at', f.created_at)
                   order by f.created_at), '[]'::jsonb)
            from public.card_files f where f.post_id = b.id)
    from public.barter_posts b
    join public.subjects ns on ns.id = b.needed_subject_id
    join public.subjects os on os.id = b.offered_subject_id
    join public.users u on u.id = b.author_id
    order by b.created_at desc;
end;
$$;
revoke execute on function public.admin_list_cards() from public, anon;
grant execute on function public.admin_list_cards() to authenticated;

-- Administrators may open (sign links to) every file in card-files.
drop policy if exists card_files_read_admin on storage.objects;
create policy card_files_read_admin on storage.objects
  for select to authenticated
  using (bucket_id = 'card-files' and (select public.am_i_admin()));

-- Record this migration in the history (applied from the SQL Editor).
insert into supabase_migrations.schema_migrations (version, name)
values ('20261102120000', 'ai_moderation')
on conflict (version) do nothing;
