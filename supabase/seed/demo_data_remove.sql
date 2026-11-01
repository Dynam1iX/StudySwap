-- Removes every demo row created by demo_data.sql (demo students have student IDs 000001–000040: e-mails 0000NN@astanait.edu.kz).
begin;
delete from public.favorites
 where post_id in (select b.id from public.barter_posts b join public.users u on u.id = b.author_id
                   where u.email like '0000__@astanait.edu.kz');
delete from public.barter_posts
 where author_id in (select id from public.users where email like '0000__@astanait.edu.kz');
delete from public.users where email like '0000__@astanait.edu.kz';
commit;
