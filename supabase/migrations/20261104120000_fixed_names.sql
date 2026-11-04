-- The name on "Complete your profile" comes from the account, not from what is typed.
-- Run once in the SQL Editor (any time: the app already sends the same name).
--
-- 1. complete_my_profile takes the name from:
--    a) the Microsoft account (given_name + family_name, or a full name with a space);
--    b) otherwise, for a teacher, the name e-mail: bakyt.bakayeva@… → Bakyt Bakayeva;
--    c) otherwise (a student signed in with an e-mail code: the e-mail is only digits)
--       what the student typed, as before.
--    The app shows a) and b) as read-only fields; the database ignores the typed name then.
-- 2. The teacher who signed up with a made-up name gets the name from their e-mail.
-- 3. Before the launch in AITU: removes the generated demo data (40 demo students
--    0000NN@astanait.edu.kz and their cards and likes; same as seed/demo_data_remove.sql).

-- 1 -------------------------------------------------------------------------
create or replace function public.complete_my_profile(p_full_name text, p_major text, p_study_year integer, p_degree text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id      uuid := (select auth.uid());
  v_email   text := lower((select auth.jwt()) ->> 'email');
  v_teacher boolean := v_email !~ '^[0-9]{6}@astanait\.edu\.kz$';
  v_meta    jsonb;
  v_given   text;
  v_family  text;
  v_account text;
  v_parts   integer;
  v_mail    text;
  v_name    text;
begin
  if v_id is null then
    raise exception 'Sign in first' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.users where id = v_id) then
    raise exception 'Your profile is already complete' using errcode = 'unique_violation';
  end if;

  -- a) Microsoft account
  select coalesce(u.raw_user_meta_data, '{}'::jsonb) into v_meta from auth.users u where u.id = v_id;
  v_given  := btrim(coalesce(v_meta ->> 'given_name', v_meta -> 'custom_claims' ->> 'given_name', ''));
  v_family := btrim(coalesce(v_meta ->> 'family_name', v_meta -> 'custom_claims' ->> 'family_name', ''));
  if v_given <> '' and v_family <> '' then
    v_account := v_given || ' ' || v_family;
  else
    v_account := btrim(regexp_replace(coalesce(v_meta ->> 'full_name', v_meta ->> 'name', ''), '\s+', ' ', 'g'));
    if position(' ' in v_account) = 0 then
      v_account := null;
    end if;
  end if;

  -- b) a teacher's name e-mail (letters only, at least first and last name)
  select string_agg(initcap(t.part), ' ' order by t.ord), count(*)
  into v_mail, v_parts
  from regexp_split_to_table(split_part(v_email, '@', 1), '[._-]+') with ordinality as t(part, ord)
  where t.part ~ '^[a-z]+$';

  v_name := case
    when v_account is not null then v_account
    when v_teacher and v_parts >= 2 then v_mail
    else btrim(regexp_replace(coalesce(p_full_name, ''), '\s+', ' ', 'g'))
  end;
  v_name := left(v_name, 100);

  if char_length(v_name) < 2 or position(' ' in v_name) = 0 then
    raise exception 'Enter your first and last name' using errcode = 'check_violation';
  end if;
  if char_length(btrim(coalesce(p_major, ''))) not between 2 and 100 then
    raise exception 'Choose your major' using errcode = 'check_violation';
  end if;

  if v_teacher then
    -- A name e-mail is a teacher whatever was sent.
    p_degree := 'Teacher';
    p_study_year := null;
  else
    if p_degree is null or p_degree not in ('Undergraduate', 'Master''s Degree') then
      raise exception 'Choose your degree' using errcode = 'check_violation';
    end if;
    if p_study_year is null or p_study_year not between 1 and 3 then
      raise exception 'Choose your year' using errcode = 'check_violation';
    end if;
  end if;

  insert into public.users (id, email, full_name, major, study_year, degree_level, role)
  values (v_id, v_email, v_name, btrim(p_major), p_study_year, p_degree, 'student');
end;
$$;

-- 2 -------------------------------------------------------------------------
update public.users set full_name = 'Bakyt Bakayeva' where email = 'bakyt.bakayeva@astanait.edu.kz';

-- 3 -------------------------------------------------------------------------
delete from public.favorites
 where post_id in (select b.id from public.barter_posts b join public.users u on u.id = b.author_id
                   where u.email like '0000__@astanait.edu.kz');
delete from public.barter_posts
 where author_id in (select id from public.users where email like '0000__@astanait.edu.kz');
delete from public.users where email like '0000__@astanait.edu.kz';

-- Record this migration in the history (applied from the SQL Editor).
insert into supabase_migrations.schema_migrations (version, name)
values ('20261104120000', 'fixed_names')
on conflict (version) do nothing;
