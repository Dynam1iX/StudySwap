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

-- Record this migration in the history (applied from the SQL Editor).
insert into supabase_migrations.schema_migrations (version, name)
values ('20261102120000', 'ai_moderation')
on conflict (version) do nothing;
