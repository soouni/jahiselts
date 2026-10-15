revoke execute on function public.owner_link_roster_account(uuid,uuid) from public, anon;
revoke execute on function public.set_hunt_drive_area(uuid,jsonb) from public, anon;
grant execute on function public.owner_link_roster_account(uuid,uuid) to authenticated;
grant execute on function public.set_hunt_drive_area(uuid,jsonb) to authenticated;
