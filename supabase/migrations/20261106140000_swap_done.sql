-- "Swap done": the author marks a card as completed (Profile → Manage → Swap done).
-- A completed card leaves the Feed and counts in Swaps done (admin_stats). Switching it on
-- again makes it active (a mistake can be undone). A pending card still cannot be changed.
-- Run once in the SQL Editor after the app version with the button is live.

create or replace function public.set_my_card_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('active', 'archived', 'completed') then
    raise exception 'A card can only be set to active, archived or completed' using errcode = 'check_violation';
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

-- Record this migration in the history (applied from the SQL Editor).
insert into supabase_migrations.schema_migrations (version, name)
values ('20261106140000', 'swap_done')
on conflict (version) do nothing;
