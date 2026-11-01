-- Administrator page /admin (End-term): moderation (requirement R7) and statistics (Part C5).
-- Run once in the SQL Editor.
--
-- 1. moderation_log: every card an administrator deleted, with the reason (no direct access).
-- 2. private.is_admin(): the signed-in user has role 'admin' or 'moderator'.
-- 3. am_i_admin(): the app shows the "Admin panel" row in Profile only to administrators.
-- 4. admin_list_cards(): every card (any status) with its author's name and e-mail.
-- 5. admin_delete_card(id, reason): deletes a card (its likes and file rows go with it by
--    cascade) and writes the moderation_log row. Files in the card-files bucket stay
--    until removed in the dashboard (Storage files cannot be deleted from SQL).
-- 6. admin_stats(): totals plus the three End-term analysis results (same SQL as the report).
-- 7. Alzhan Yerzhanuly (260668) becomes the first administrator.
--
-- Students cannot make themselves administrators: users.role has no UPDATE grant
-- (see 20261023010000_owner_rules.sql), and every function below checks the role in the database.

-- 1 -------------------------------------------------------------------------
create table if not exists public.moderation_log (
  id                  bigint generated always as identity primary key,
  admin_id            uuid references public.users (id) on delete set null,
  post_id             uuid not null,
  author_id           uuid,
  needed_subject_id   integer,
  offered_subject_id  integer,
  description         text,
  offered_description text,
  reason              text not null check (char_length(btrim(reason)) between 1 and 200),
  deleted_at          timestamptz not null default now()
);
comment on table public.moderation_log is 'Cards deleted by an administrator, with the reason. Only reachable through admin_delete_card.';
alter table public.moderation_log enable row level security;
revoke all on public.moderation_log from anon, authenticated;

-- 2 -------------------------------------------------------------------------
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.users u
    where u.id = (select auth.uid()) and u.role in ('admin', 'moderator')
  );
$$;
revoke execute on function private.is_admin() from public, anon, authenticated;

-- 3 -------------------------------------------------------------------------
create or replace function public.am_i_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin();
$$;
revoke execute on function public.am_i_admin() from public, anon;
grant execute on function public.am_i_admin() to authenticated;

-- 4 -------------------------------------------------------------------------
create or replace function public.admin_list_cards()
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
  file_count integer
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
           (select count(*)::integer from public.card_files f where f.post_id = b.id)
    from public.barter_posts b
    join public.subjects ns on ns.id = b.needed_subject_id
    join public.subjects os on os.id = b.offered_subject_id
    join public.users u on u.id = b.author_id
    order by b.created_at desc;
end;
$$;
revoke execute on function public.admin_list_cards() from public, anon;
grant execute on function public.admin_list_cards() to authenticated;

-- 5 -------------------------------------------------------------------------
create or replace function public.admin_delete_card(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.barter_posts;
begin
  if not private.is_admin() then
    raise exception 'Only administrators can delete other students'' cards' using errcode = 'insufficient_privilege';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 1 and 200 then
    raise exception 'Choose a reason' using errcode = 'check_violation';
  end if;

  delete from public.barter_posts where id = p_id returning * into v_post;
  if not found then
    raise exception 'This card no longer exists' using errcode = 'no_data_found';
  end if;

  insert into public.moderation_log
    (admin_id, post_id, author_id, needed_subject_id, offered_subject_id, description, offered_description, reason)
  values
    ((select auth.uid()), v_post.id, v_post.author_id, v_post.needed_subject_id, v_post.offered_subject_id,
     v_post.description, v_post.offered_description, btrim(p_reason));
end;
$$;
revoke execute on function public.admin_delete_card(uuid, text) from public, anon;
grant execute on function public.admin_delete_card(uuid, text) to authenticated;

-- 6 -------------------------------------------------------------------------
-- The three queries are the ones in the End-term report (Part C2); dates in Astana time (UTC+5).
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date := ((now() at time zone 'UTC') + interval '5 hours')::date;
  v_result jsonb;
begin
  if not private.is_admin() then
    raise exception 'Only administrators can open this page' using errcode = 'insufficient_privilege';
  end if;

  select jsonb_build_object(
    'totals', (
      select jsonb_build_object(
        'cards', count(*),
        'active', count(*) filter (where b.status = 'active'),
        'completed', count(*) filter (where b.status = 'completed'),
        'students', (select count(*) from public.users u where u.degree_level <> 'Teacher'),
        'deleted', (select count(*) from public.moderation_log))
      from public.barter_posts b),

    -- Q1: which subjects are needed most, and how many students offer them?
    'demand', coalesce((
      select jsonb_agg(row_to_json(q)::jsonb order by q.needed desc, q.offered asc, q.subject)
      from (
        select s.name::text as subject, s.category::text as category,
               count(*) filter (where b.needed_subject_id = s.id) as needed,
               count(*) filter (where b.offered_subject_id = s.id) as offered
        from public.subjects s
        join public.barter_posts b on s.id in (b.needed_subject_id, b.offered_subject_id)
        group by s.name, s.category
        order by needed desc, offered asc, subject
        limit 6
      ) q), '[]'::jsonb),

    -- Q2: new cards per day, last 14 days (days without cards count as 0).
    'per_day', (
      select jsonb_agg(jsonb_build_object('day', d.day::date, 'cards', coalesce(c.cards, 0)) order by d.day)
      from generate_series(v_today - 13, v_today, interval '1 day') as d(day)
      left join (
        select ((b.created_at at time zone 'UTC') + interval '5 hours')::date as day, count(*) as cards
        from public.barter_posts b
        group by 1
      ) c on c.day = d.day::date),

    -- Q3: cards and completed swaps per category of the needed subject.
    'categories', coalesce((
      select jsonb_agg(row_to_json(q)::jsonb order by q.rate desc, q.category)
      from (
        select s.category::text as category,
               count(*) as cards,
               count(*) filter (where b.status = 'completed') as completed,
               round(100.0 * count(*) filter (where b.status = 'completed') / count(*), 1) as rate
        from public.barter_posts b
        join public.subjects s on s.id = b.needed_subject_id
        group by s.category
      ) q), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;
revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

-- 7 -------------------------------------------------------------------------
update public.users set role = 'admin' where email = '260668@astanait.edu.kz';

-- Record this migration in the history (applied from the SQL Editor).
insert into supabase_migrations.schema_migrations (version, name)
values ('20261101120000', 'admin')
on conflict (version) do nothing;
