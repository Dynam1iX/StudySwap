-- "About me" on the profile (requirement R6): a short text, up to 200 characters.
--
-- * users.bio: '' by default, at most 200 characters (checked by the database, not only the app).
-- * set_my_bio(text): a student changes only their own bio (profile rows are read-only, so the
--   change goes through a function, like the photo and Telegram).
-- * get_bio(uuid): any signed-in student can read a bio (it is shown on /profile and /u/[id]);
--   nothing is readable without signing in.
-- Run once in the SQL Editor.

alter table public.users
  add column if not exists bio text not null default ''
  constraint users_bio_length check (char_length(bio) <= 200);

create or replace function public.set_my_bio(p_bio text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := private.current_user_id();
begin
  if v_me is null then
    raise exception 'Sign in first' using errcode = 'insufficient_privilege';
  end if;
  update public.users
  set bio = btrim(coalesce(p_bio, ''))
  where id = v_me;
end;
$$;

create or replace function public.get_bio(p_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.bio
  from public.users u
  where u.id = p_id
    and private.current_user_id() is not null;
$$;

revoke all on function public.set_my_bio(text) from public, anon;
revoke all on function public.get_bio(uuid) from public, anon;
grant execute on function public.set_my_bio(text) to authenticated;
grant execute on function public.get_bio(uuid) to authenticated;

-- Record this migration in the history (applied from the SQL Editor).
insert into supabase_migrations.schema_migrations (version, name)
values ('20261108120000', 'bio')
on conflict (version) do nothing;
