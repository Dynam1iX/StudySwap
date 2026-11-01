-- StudySwap — demo (test) data for the End-term data analysis (Part C).
-- 40 demo students (student IDs 000001–000040, which no real AITU student has) and 125 barter cards
-- spread over 12 Oct – 1 Nov 2026. This is GENERATED test data: the charts
-- built on it show that the analysis method works, not what real users do.
-- Deterministic: setseed() makes every run produce the same cards.
-- Remove everything with supabase/seed/demo_data_remove.sql.

begin;

select setseed(0.2626);

-- Subject weights: how often a subject is needed / offered, plus short topic texts.
create temp table demo_w (subject_id int, need_w int, offer_w int, need_t text[], offer_t text[]) on commit drop;
insert into demo_w values
 (1,  9, 10, '{"loops and arrays","functions in C++","pointers"}', '{"all basics, C++","loops, arrays, functions"}'),
 (2,  8,  6, '{"structs and files","recursion","STL vectors"}', '{"recursion and STL","file handling"}'),
 (3, 10,  6, '{"inheritance and polymorphism","SOLID, interfaces","Java classes"}', '{"Java OOP, patterns","classes, interfaces"}'),
 (4,  9,  4, '{"Big-O and sorting","trees and graphs","dynamic programming"}', '{"sorting, BFS/DFS","LeetCode-style tasks"}'),
 (5,  7,  4, '{"SQL joins","normalization","ER diagrams"}', '{"SQL, joins, GROUP BY","ER diagrams"}'),
 (6,  5,  2, '{"binary and assembly","CPU pipeline"}', '{"assembly basics"}'),
 (7,  4,  5, '{"networks and IoT","databases basics"}', '{"networks, cloud, IoT"}'),
 (8,  1,  1, '{"report format"}', '{"report format"}'),
 (9, 16,  7, '{"limits","derivatives","integrals"}', '{"limits and derivatives","all midterm topics"}'),
 (10, 9,  3, '{"series","integration techniques","multiple integrals"}', '{"series and integrals"}'),
 (11,13,  9, '{"RREF and matrices","eigenvalues","vector spaces"}', '{"matrices, RREF","eigenvalues, determinants"}'),
 (12,12,  5, '{"proofs and logic","combinatorics","graph theory"}', '{"logic, sets, proofs","combinatorics"}'),
 (13, 6,  4, '{"exam dates and periods","essay structure"}', '{"periods and key dates"}'),
 (14, 3,  3, '{"essay topics"}', '{"essays and presentations"}'),
 (15, 3,  4, '{"theories for the essay"}', '{"main theories"}'),
 (16, 3,  3, '{"political systems"}', '{"political systems"}'),
 (17, 3,  4, '{"exam questions"}', '{"cognitive psychology"}'),
 (18, 3,  6, '{"grammar tenses","speaking practice"}', '{"grammar and speaking"}'),
 (19, 5,  9, '{"IELTS writing","speaking practice"}', '{"IELTS writing tips","speaking practice"}'),
 (20, 3,  7, '{"academic writing"}', '{"academic writing","essay feedback"}'),
 (21, 2,  3, '{"HSK 1 characters"}', '{"HSK 1-2"}'),
 (22, 2,  2, '{"A1 grammar"}', '{"A1-A2 basics"}'),
 (23, 2,  3, '{"Hangul and basics"}', '{"Hangul, basic phrases"}');

-- Cumulative ranges in [0,1) for weighted random picks.
create temp table demo_need on commit drop as
  select subject_id, need_t,
         (sum(need_w) over (order by subject_id) - need_w)::float / sum(need_w) over () as lo,
          sum(need_w) over (order by subject_id)::float / sum(need_w) over () as hi
  from demo_w;
create temp table demo_offer on commit drop as
  select subject_id, offer_t,
         (sum(offer_w) over (order by subject_id) - offer_w)::float / sum(offer_w) over () as lo,
          sum(offer_w) over (order by subject_id)::float / sum(offer_w) over () as hi
  from demo_w;

-- Days 12 Oct .. 1 Nov: activity grows towards the exam weeks, weekends are quieter.
create temp table demo_day on commit drop as
  with d as (
    select i, (date '2026-10-12' + i) as day,
           (1 + 0.09 * i) * case when extract(isodow from date '2026-10-12' + i) >= 6 then 0.55 else 1 end as w
    from generate_series(0, 20) i)
  select day, (sum(w) over (order by i) - w) / sum(w) over () as lo, sum(w) over (order by i) / sum(w) over () as hi from d;

-- Hour of day in Astana time (UTC+5): quiet at night, peak in the evening.
create temp table demo_hour on commit drop as
  with h as (select h, (array[2,1,.5,.3,.2,.2,.4,1,2,3,3,3,4,4,3,3,4,5,6,8,9,8,6,4])[h + 1]::float as w
             from generate_series(0, 23) h)
  select h, (sum(w) over (order by h) - w) / sum(w) over () as lo, sum(w) over (order by h) / sum(w) over () as hi from h;

-- 40 demo students.
insert into public.users (email, full_name, major, study_year, degree_level, role, created_at)
select format('0000%s@astanait.edu.kz', lpad(g::text, 2, '0')),
       case when g % 2 = 0
            then (array['Aigerim','Dana','Madina','Aruzhan','Kamila','Togzhan','Aliya','Dilnaz','Saule','Zhansaya',
                        'Amina','Ayana','Inkar','Malika','Aisha','Assel','Nazerke','Tomiris','Akbota','Moldir'])[1 + (g * 7) % 20]
            else (array['Arman','Dias','Nurlan','Temirlan','Yerassyl','Madi','Daniyar','Alisher','Bekzat','Adil',
                        'Rustem','Ilyas','Aibek','Miras','Sultan','Abylai','Ernur','Zhandos','Askar','Timur'])[1 + (g * 3) % 20]
       end || ' ' ||
       (select case when g % 2 = 0 and s like '%ov' then s || 'a' else s end
        from (select (array['Abenov','Seitkali','Zhumabek','Omarov','Bekov','Tulegen','Kassym','Nurlanov','Sarsen','Akhmet',
                            'Yesen','Dauletov','Mukhtar','Serik','Bolat','Kenzhe','Ospan','Zhaksylyk','Amanov','Baimukhan'])[1 + (g * 11) % 20] as s) x),
       (array['Software Engineering','Software Engineering','Software Engineering','Software Engineering','Software Engineering',
              'Software Engineering','Software Engineering','Computer Science','Computer Science','Computer Science',
              'Computer Science','Cybersecurity','Cybersecurity','Cybersecurity','Big Data Analysis','Big Data Analysis',
              'IT Management','IT Management','Media Technologies','Smart Technologies'])[1 + floor(random() * 20)::int],
       (array[1,1,1,1,1,1,2,2,2,3])[1 + floor(random() * 10)::int],
       'Undergraduate', 'student',
       timestamptz '2026-10-12 00:00+00' + random() * interval '13 days'
from generate_series(1, 40) g;

-- 125 demo cards: fixed random numbers per card, then weighted picks.
create temp table demo_r on commit drop as
  select g, random() r_day, random() r_hour, random() r_min, random() r_need, random() r_offer,
         random() r_author, random() r_status, random() r_t1, random() r_t2, random() r_p1, random() r_p2
  from generate_series(1, 125) g;

with demo_users as (
  select id, row_number() over (order by email) as n from public.users where email like '0000__@astanait.edu.kz'
), picked as (
  select r.*,
         least((dd.day::timestamp at time zone 'UTC') + make_interval(hours => hh.h - 5) + r_min * interval '59 minutes',
               timestamptz '2026-11-01 10:00+00') as ts,
         n.subject_id as need_id, n.need_t,
         o.subject_id as offer_id0, o.offer_t
  from demo_r r
  join demo_day dd on r.r_day >= dd.lo and r.r_day < dd.hi
  join demo_hour hh on r.r_hour >= hh.lo and r.r_hour < hh.hi
  join demo_need n on r.r_need >= n.lo and r.r_need < n.hi
  join demo_offer o on r.r_offer >= o.lo and r.r_offer < o.hi
)
insert into public.barter_posts (author_id, needed_subject_id, offered_subject_id, description, offered_description,
                                 contact_method, status, created_at)
select u.id,
       p.need_id,
       case when p.offer_id0 = p.need_id then p.need_id % 23 + 1 else p.offer_id0 end,
       (array['Need help with ','Struggling with ','Please explain ','Stuck on ',''])[1 + floor(p.r_p1 * 5)::int]
         || p.need_t[1 + floor(p.r_t1 * array_length(p.need_t, 1))::int],
       (array['Can explain ','Happy to help with ','I can teach ','Good at ',''])[1 + floor(p.r_p2 * 5)::int]
         || coalesce((select offer_t[1 + floor(p.r_t2 * array_length(offer_t, 1))::int] from demo_w
                      where subject_id = case when p.offer_id0 = p.need_id then p.need_id % 23 + 1 else p.offer_id0 end),
                     'all topics'),
       'email',
       case when p.ts < timestamptz '2026-10-27 00:00+00' and p.r_status < 0.22 then 'completed'
            when p.r_status > 0.95 then 'archived'
            else 'active' end,
       p.ts
from picked p
join demo_users u on u.n = 1 + floor(p.r_author * 40)::int;

-- A student must exist before their first card.
update public.users u
set created_at = least(u.created_at, f.first_card - interval '45 minutes')
from (select author_id, min(created_at) as first_card from public.barter_posts group by author_id) f
where f.author_id = u.id and u.email like '0000__@astanait.edu.kz';

commit;
