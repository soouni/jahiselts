-- Already applied to production Supabase. Preserve and regression-proof the
-- security changes in version control.
revoke execute on function public.owner_link_roster_account(uuid,uuid) from public, anon;
revoke execute on function public.set_hunt_drive_area(uuid,jsonb) from public, anon;
grant execute on function public.owner_link_roster_account(uuid,uuid) to authenticated;
grant execute on function public.set_hunt_drive_area(uuid,jsonb) to authenticated;

-- owner is deliberately excluded from accepted values. Otherwise an admin
-- could create a second owner account and bypass every owner-only guard.
create or replace function public.admin_member(
 member_email text,member_name text,member_role text,member_active boolean
) returns void language plpgsql security definer set search_path='' as $$
declare
 e text:=lower(trim(member_email));
 old public.memberships;
 actor_role text:=public.my_role();
begin
 if actor_role is null or actor_role not in ('owner','admin') then
  raise exception 'Tegevus ei ole lubatud' using errcode='42501';
 end if;
 if member_role is null or member_role not in ('admin','member','viewer') then
  raise exception 'Lubamatu kasutajaroll' using errcode='22023';
 end if;
 if member_active is null then raise exception 'Aktiivsuse väärtus puudub' using errcode='22023';end if;
 if member_name is null or trim(member_name)='' then raise exception 'Liikme nimi puudub' using errcode='22023';end if;
 if e is null or e!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
  raise exception 'Vigane e-posti aadress' using errcode='22023';
 end if;

 perform 1 from public.club_settings where id for update;
 select * into old from public.memberships where email=e for update;

 if old.role='owner' then raise exception 'Omanikukontot ei saa muuta' using errcode='42501';end if;
 if actor_role='admin' and (member_role='admin' or old.role='admin') then
  raise exception 'Administraatori õigusi saab muuta ainult omanik' using errcode='42501';
 end if;
 if old.user_id=auth.uid() and (not member_active or member_role<>actor_role) then
  raise exception 'Enda õigusi ei saa siin eemaldada' using errcode='42501';
 end if;
 if member_active and not coalesce(old.active,false)
    and (select count(*) from public.memberships where active)>=30 then
  raise exception 'Seltsis on juba 30 aktiivset kasutajat';
 end if;

 insert into public.memberships(email,display_name,role,active)
 values(e,trim(member_name),member_role,member_active)
 on conflict(email) do update set
  display_name=excluded.display_name,role=excluded.role,active=excluded.active;

 insert into public.audit_events(kind,action,actor,actor_name,before_data,after_data)
 values('membership','Õigused muudetud',auth.uid(),
  (select display_name from public.memberships where user_id=auth.uid()),to_jsonb(old),
  jsonb_build_object('email',e,'role',member_role,'active',member_active));
end;$$;
revoke all on function public.admin_member(text,text,text,boolean) from public,anon;
grant execute on function public.admin_member(text,text,text,boolean) to authenticated;

create or replace function public.owner_link_roster_account(target_roster_id uuid,target_user_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists (
  select 1 from public.memberships m
  where m.user_id=auth.uid() and m.role='owner' and m.active=true
 ) then
  raise exception 'Kasutajakonto sidumine on lubatud ainult aktiivsele omanikule.' using errcode='42501';
 end if;
 if not exists(select 1 from public.hunt_roster where id=target_roster_id for update) then
  raise exception 'Jahimeest ei leitud.';
 end if;
 if target_user_id is not null then
  if not exists(select 1 from public.memberships m where m.user_id=target_user_id and m.active=true) then
   raise exception 'Valitud kasutaja ei ole aktiivne seltsi liige.';
  end if;
  if exists(select 1 from public.hunt_roster r where r.user_id=target_user_id and r.id<>target_roster_id) then
   raise exception 'See kasutajakonto on juba teise jahimehega seotud.';
  end if;
 end if;
 update public.hunt_roster set user_id=target_user_id where id=target_roster_id;
 update public.hunt_participants set user_id=target_user_id where roster_id=target_roster_id;
end;$$;
revoke all on function public.owner_link_roster_account(uuid,uuid) from public,anon;
grant execute on function public.owner_link_roster_account(uuid,uuid) to authenticated;

create or replace function public.protect_hunt_roster_user_link()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (tg_op='INSERT' and new.user_id is not null)
    or (tg_op='UPDATE' and new.user_id is distinct from old.user_id) then
  if auth.uid() is null or not exists (
   select 1 from public.memberships m
   where m.user_id=auth.uid() and m.active=true and m.role='owner'
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
