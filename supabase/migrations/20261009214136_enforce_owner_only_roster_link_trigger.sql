create or replace function public.protect_hunt_roster_user_link()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (tg_op='INSERT' and new.user_id is not null)
    or (tg_op='UPDATE' and new.user_id is distinct from old.user_id) then
  if auth.uid() is null or not exists (
   select 1 from public.memberships m where m.user_id=auth.uid() and m.active=true and m.role='owner'
  ) then
   raise exception 'Jahimehe kasutajakonto seost saab muuta ainult aktiivne omanik.' using errcode='42501';
  end if;
 end if;
 return new;
end;$$;
drop trigger if exists hunt_roster_user_link_owner_only on public.hunt_roster;
create trigger hunt_roster_user_link_owner_only
before insert or update of user_id on public.hunt_roster
for each row execute function public.protect_hunt_roster_user_link();
revoke all on function public.protect_hunt_roster_user_link() from public,anon,authenticated;
