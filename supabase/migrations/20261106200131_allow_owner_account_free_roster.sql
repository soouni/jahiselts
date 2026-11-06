-- Owners need the same roster management access as administrators.
-- Account linking remains protected by hunt_roster_user_link_owner_only.
drop policy if exists hunt_roster_write on public.hunt_roster;
create policy hunt_roster_write on public.hunt_roster
for all to authenticated
using (exists (
 select 1 from public.memberships m
 where m.user_id=(select auth.uid()) and m.active
 and m.role in ('owner','admin','member')
))
with check (exists (
 select 1 from public.memberships m
 where m.user_id=(select auth.uid()) and m.active
 and m.role in ('owner','admin','member')
));
