-- Search finds students by first and last name (any registered user, signed-in only).
-- Run once in the SQL Editor (after the app version with the "Students" block is live,
-- or before: until then the app shows only cards).
--
-- private.name_key folds spellings together, exactly like nameKey in src/lib/nameSearch.ts
-- (the app also turns Cyrillic into Latin first): "Alikhan" and "Alihan" → "alihan".
-- search_students(keys) returns only what a profile page shows anyway: name, program,
-- year / Teacher, photo and the number of active cards. Never e-mails or Telegram.

create or replace function private.name_key(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    replace(replace(replace(
    replace(replace(replace(replace(replace(
    replace(replace(replace(replace(replace(replace(replace(
      regexp_replace(lower(coalesce(p_text, '')), '[^a-z ]', '', 'g'),
      'sch', 's'), 'kh', 'h'), 'zh', 'j'), 'ch', 'c'), 'sh', 's'), 'ts', 'c'), 'gh', 'g'),
      'yu', 'iu'), 'ya', 'ia'), 'yo', 'io'), 'ye', 'e'), 'y', 'i'),
      'q', 'k'), 'w', 'v'), 'x', 'ks'),
    '(.)\1+', '\1', 'g');
$$;

create or replace function public.search_students(p_keys text[])
returns table (
  id uuid,
  full_name text,
  major text,
  study_year integer,
  degree_level text,
  avatar_path text,
  active_cards integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_keys text[];
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in first' using errcode = 'insufficient_privilege';
  end if;
  -- Only words of 2+ folded letters, at most 5: no listing everyone with one letter.
  select array_agg(k) into v_keys
  from (select private.name_key(k) as k from unnest(coalesce(p_keys, '{}')) as k limit 5) words
  where char_length(k) >= 2;
  if v_keys is null then
    return;
  end if;

  return query
    select u.id, u.full_name::text, u.major::text, u.study_year, u.degree_level::text, u.avatar_path::text,
           (select count(*)::integer from public.barter_posts p where p.author_id = u.id and p.status = 'active')
    from public.users u
    where (select bool_and(position(k in private.name_key(u.full_name)) > 0) from unnest(v_keys) as k)
    order by 7 desc, u.full_name
    limit 20;
end;
$$;
revoke execute on function public.search_students(text[]) from public, anon;
grant execute on function public.search_students(text[]) to authenticated;
revoke execute on function private.name_key(text) from public, anon, authenticated;

-- Record this migration in the history (applied from the SQL Editor).
insert into supabase_migrations.schema_migrations (version, name)
values ('20261106120000', 'search_students')
on conflict (version) do nothing;
