-- Final Project, report section 7: data analysis on the live database (real data only;
-- the generated End-term demo data was removed on 2026-11-04).
-- Read-only: run each query in the Supabase SQL Editor and take a screenshot of the result.

-- Q1: which subjects are needed most, and how many cards offer them?
-- (high "needed" + low "offered" = a subject where students lack helpers)
select s.name as subject,
       s.category,
       count(*) filter (where b.needed_subject_id = s.id)  as needed,
       count(*) filter (where b.offered_subject_id = s.id) as offered
from public.subjects s
join public.barter_posts b on s.id in (b.needed_subject_id, b.offered_subject_id)
group by s.name, s.category
order by needed desc, offered asc, subject
limit 6;

-- Q2: new cards per day (Astana time, UTC+5).
select ((b.created_at at time zone 'UTC') + interval '5 hours')::date as day,
       count(*) as cards
from public.barter_posts b
group by 1
order by 1;

-- Q3: cards and completed swaps per category of the needed subject.
select s.category,
       count(*)                                        as cards,
       count(*) filter (where b.status = 'completed')  as completed,
       round(100.0 * count(*) filter (where b.status = 'completed') / count(*), 1) as completion_rate
from public.barter_posts b
join public.subjects s on s.id = b.needed_subject_id
group by s.category
order by completion_rate desc, s.category;
