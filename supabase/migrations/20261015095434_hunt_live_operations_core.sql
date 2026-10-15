-- Fresh installs must define management authorization before dependent policies.
-- This mirrors the already-deployed management rules; the later security
-- migration reasserts the same helper for existing installations.
create or replace function public.can_manage_hunt(target_hunt_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.hunts h
    join public.memberships m on m.user_id = (select auth.uid())
    where h.id = target_hunt_id
      and h.status <> 'finished'
      and m.active = true
      and (
        m.role in ('owner', 'admin')
        or (m.role = 'member' and h.leader_id = (select auth.uid()))
      )
  );
$$;

revoke all on function public.can_manage_hunt(uuid) from public, anon;
grant execute on function public.can_manage_hunt(uuid) to authenticated;


drop policy if exists hunts_insert on public.hunts;
create policy hunts_insert on public.hunts for insert to authenticated with check(leader_id=(select auth.uid()) and public.my_role() in ('owner','admin'));
drop policy if exists hunts_update on public.hunts;
create policy hunts_update on public.hunts for update to authenticated using(public.can_manage_hunt(id)) with check(public.my_role() in ('owner','admin') or (public.my_role()='member' and leader_id=(select auth.uid())));
drop policy if exists drives_insert on public.hunt_drives;
create policy drives_insert on public.hunt_drives for insert to authenticated with check(exists(select 1 from public.hunts h where h.id=hunt_id and h.status='planned' and public.can_manage_hunt(h.id)));
drop policy if exists drives_update on public.hunt_drives;
create policy drives_update on public.hunt_drives for update to authenticated using(public.can_manage_hunt(hunt_id)) with check(public.can_manage_hunt(hunt_id));
drop policy if exists participants_insert on public.hunt_participants;
create policy participants_insert on public.hunt_participants for insert to authenticated with check(public.can_manage_hunt(hunt_id));
drop policy if exists participants_update on public.hunt_participants;
create policy participants_update on public.hunt_participants for update to authenticated using(public.can_manage_hunt(hunt_id)) with check(public.can_manage_hunt(hunt_id));
drop policy if exists hunt_participants_leader_delete on public.hunt_participants;
create policy hunt_participants_leader_delete on public.hunt_participants for delete to authenticated using(public.can_manage_hunt(hunt_id));
drop policy if exists positions_insert on public.hunt_positions;
create policy positions_insert on public.hunt_positions for insert to authenticated with check(exists(select 1 from public.hunt_drives d where d.id=drive_id and public.can_manage_hunt(d.hunt_id)));
drop policy if exists hunt_positions_leader_update on public.hunt_positions;
create policy hunt_positions_leader_update on public.hunt_positions for update to authenticated using(exists(select 1 from public.hunt_drives d where d.id=drive_id and public.can_manage_hunt(d.hunt_id))) with check(exists(select 1 from public.hunt_drives d where d.id=drive_id and public.can_manage_hunt(d.hunt_id)));
drop policy if exists hunt_positions_leader_delete on public.hunt_positions;
create policy hunt_positions_leader_delete on public.hunt_positions for delete to authenticated using(exists(select 1 from public.hunt_drives d where d.id=drive_id and public.can_manage_hunt(d.hunt_id)));

-- Preserve the deployed guard when replaying the management policies.
create or replace function public.protect_hunt_update()
returns trigger language plpgsql security definer set search_path='' as $$
declare actor_role text:=public.my_role();
begin
 if old.status='finished' then raise exception 'Lõpetatud jahti ei saa muuta'; end if;
 if actor_role is null or actor_role not in ('owner','admin') then
  if new.leader_id is distinct from old.leader_id then raise exception 'Jahijuhti saab muuta ainult omanik või administraator'; end if;
  if new.created_at is distinct from old.created_at then raise exception 'Jahi loomise aega ei saa muuta'; end if;
 end if;
 return new;
end; $$;
revoke all on function public.protect_hunt_update() from public,anon,authenticated;
drop trigger if exists protect_hunt_update on public.hunts;
create trigger protect_hunt_update before update on public.hunts for each row execute function public.protect_hunt_update();

-- Active hunt operations: explicit lifecycle, arrival confirmation and
-- privacy-preserving live locations. All mutations remain subject to RLS.

create unique index if not exists hunts_one_active
  on public.hunts ((status)) where status='active';

create unique index if not exists hunt_drives_one_active_per_hunt
  on public.hunt_drives (hunt_id) where status='active';

alter table public.hunts
  add column if not exists updated_at timestamptz not null default now();

alter table public.hunt_drives
  add column if not exists started_at timestamptz,
  add column if not exists finished_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.hunt_locations (
  participant_id uuid primary key references public.hunt_participants(id) on delete cascade,
  hunt_id uuid not null references public.hunts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  location jsonb not null,
  accuracy_m numeric not null check(accuracy_m>=0 and accuracy_m<=10000),
  heading_deg numeric check(heading_deg is null or (heading_deg>=0 and heading_deg<360)),
  recorded_at timestamptz not null,
  received_at timestamptz not null default now(),
  constraint hunt_locations_point check(
    location->>'type'='Point'
    and jsonb_typeof(location->'coordinates')='array'
    and jsonb_array_length(location->'coordinates')=2
    and ((location->'coordinates'->>0)::numeric between -180 and 180)
    and ((location->'coordinates'->>1)::numeric between -90 and 90)
  )
);

alter table public.hunt_locations enable row level security;

drop policy if exists hunt_locations_select on public.hunt_locations;
create policy hunt_locations_select on public.hunt_locations for select to authenticated
using (
  user_id=(select auth.uid())
  or public.can_manage_hunt(hunt_id)
  or exists(
    select 1 from public.hunt_participants viewer
    where viewer.hunt_id=hunt_locations.hunt_id
      and viewer.user_id=(select auth.uid())
  )
);

drop policy if exists hunt_locations_insert on public.hunt_locations;
create policy hunt_locations_insert on public.hunt_locations for insert to authenticated
with check (
  user_id=(select auth.uid())
  and exists(
    select 1 from public.hunt_participants participant
    join public.hunts hunt on hunt.id=participant.hunt_id
    where participant.id=hunt_locations.participant_id
      and participant.hunt_id=hunt_locations.hunt_id
      and participant.user_id=(select auth.uid())
      and hunt.status in ('active','paused')
  )
);

drop policy if exists hunt_locations_update on public.hunt_locations;
create policy hunt_locations_update on public.hunt_locations for update to authenticated
using (user_id=(select auth.uid()))
with check (
  user_id=(select auth.uid())
  and exists(
    select 1 from public.hunt_participants participant
    join public.hunts hunt on hunt.id=participant.hunt_id
    where participant.id=hunt_locations.participant_id
      and participant.hunt_id=hunt_locations.hunt_id
      and participant.user_id=(select auth.uid())
      and hunt.status in ('active','paused')
  )
);

drop policy if exists hunt_locations_delete on public.hunt_locations;
create policy hunt_locations_delete on public.hunt_locations for delete to authenticated
using (user_id=(select auth.uid()) or public.can_manage_hunt(hunt_id));

grant select,insert,update,delete on public.hunt_locations to authenticated;
revoke all on public.hunt_locations from anon;

create or replace function public.set_hunt_status(target_hunt_id uuid,new_status text)
returns public.hunts
language plpgsql
security invoker
set search_path=''
as $$
declare
  current_hunt public.hunts;
  result public.hunts;
begin
  select * into current_hunt from public.hunts where id=target_hunt_id for update;
  if current_hunt.id is null or not public.can_manage_hunt(target_hunt_id) then
    raise exception 'Hunt not found or permission denied';
  end if;
  if new_status not in ('active','paused','finished') then
    raise exception 'Unsupported hunt status';
  end if;
  if current_hunt.status='finished' then
    raise exception 'Finished hunt cannot be reopened';
  end if;
  if new_status='active' and exists(
    select 1 from public.hunts where id<>target_hunt_id and status='active'
  ) then
    raise exception 'Another hunt is already active';
  end if;
  update public.hunts
    set status=new_status,
        starts_at=case when new_status='active' then coalesce(starts_at,now()) else starts_at end,
        updated_at=now()
    where id=target_hunt_id returning * into result;
  if new_status='finished' then
    update public.hunt_drives set status='finished',finished_at=coalesce(finished_at,now()),updated_at=now()
      where hunt_id=target_hunt_id and status<>'finished';
    delete from public.hunt_locations where hunt_id=target_hunt_id;
  end if;
  return result;
end;
$$;

create or replace function public.activate_hunt_drive(target_drive_id uuid)
returns public.hunt_drives
language plpgsql
security invoker
set search_path=''
as $$
declare
  target public.hunt_drives;
  result public.hunt_drives;
begin
  select * into target from public.hunt_drives where id=target_drive_id for update;
  if target.id is null or not public.can_manage_hunt(target.hunt_id) then
    raise exception 'Drive not found or permission denied';
  end if;
  if target.status='finished' then raise exception 'Finished drive cannot be restarted'; end if;
  if exists(select 1 from public.hunts where id<>target.hunt_id and status='active') then
    raise exception 'Another hunt is already active';
  end if;
  update public.hunt_drives
    set status='finished',finished_at=coalesce(finished_at,now()),updated_at=now()
    where hunt_id=target.hunt_id and status='active' and id<>target_drive_id;
  update public.hunt_drives
    set status='active',started_at=coalesce(started_at,now()),finished_at=null,updated_at=now()
    where id=target_drive_id returning * into result;
  update public.hunts
    set status='active',starts_at=coalesce(starts_at,now()),updated_at=now()
    where id=target.hunt_id;
  delete from public.hunt_locations where hunt_id=target.hunt_id;
  update public.hunt_participants set status='present' where hunt_id=target.hunt_id and status<>'left';
  update public.hunt_positions set confirmed_at=null,confirmation_accuracy_m=null,confirmation_distance_m=null
    where drive_id=target_drive_id;
  return result;
end;
$$;

create or replace function public.finish_hunt_drive(target_drive_id uuid)
returns public.hunt_drives
language plpgsql
security invoker
set search_path=''
as $$
declare
  target public.hunt_drives;
  result public.hunt_drives;
begin
  select * into target from public.hunt_drives where id=target_drive_id for update;
  if target.id is null or not public.can_manage_hunt(target.hunt_id) then
    raise exception 'Drive not found or permission denied';
  end if;
  update public.hunt_drives set status='finished',finished_at=coalesce(finished_at,now()),updated_at=now()
    where id=target_drive_id returning * into result;
  delete from public.hunt_locations where hunt_id=target.hunt_id;
  update public.hunt_participants set status='present' where hunt_id=target.hunt_id and status<>'left';
  return result;
end;
$$;
