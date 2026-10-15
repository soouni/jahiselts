create policy hunt_participants_leader_delete on public.hunt_participants for delete to authenticated using(exists(select 1 from public.hunts h where h.id=hunt_id and h.leader_id=(select auth.uid())));
create policy hunt_positions_leader_delete on public.hunt_positions for delete to authenticated using(exists(select 1 from public.hunt_drives d join public.hunts h on h.id=d.hunt_id where d.id=drive_id and h.leader_id=(select auth.uid())));
grant delete on public.hunt_participants,public.hunt_positions to authenticated;
