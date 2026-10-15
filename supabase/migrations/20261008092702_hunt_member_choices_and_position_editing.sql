create or replace function public.hunt_member_choices()
returns table(user_id uuid, display_name text)
language sql stable security definer set search_path = ''
as $$
 select m.user_id,m.display_name from public.memberships m
 where m.active and m.user_id is not null
 and exists(select 1 from public.memberships self where self.user_id=(select auth.uid()) and self.active)
 order by m.display_name
$$;
revoke all on function public.hunt_member_choices() from public,anon;
grant execute on function public.hunt_member_choices() to authenticated;

create policy hunt_positions_leader_update on public.hunt_positions for update to authenticated using(
 exists(select 1 from public.hunt_drives d join public.hunts h on h.id=d.hunt_id where d.id=drive_id and h.leader_id=(select auth.uid()))
) with check(
 exists(select 1 from public.hunt_drives d join public.hunts h on h.id=d.hunt_id where d.id=drive_id and h.leader_id=(select auth.uid()))
);
grant update on public.hunt_positions to authenticated;
