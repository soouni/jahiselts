alter table public.hunt_roster drop constraint if exists hunt_roster_default_role_check;
alter table public.hunt_roster add constraint hunt_roster_default_role_check check (default_role in ('hunter','driver','dog_driver'));
alter table public.hunt_participants drop constraint if exists hunt_participants_role_check;
alter table public.hunt_participants add constraint hunt_participants_role_check check (role in ('leader','hunter','driver','dog_driver','guest'));
