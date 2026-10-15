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

create or replace function public.claim_hunt_position(target_position_id uuid)
returns public.hunt_positions
language plpgsql
security invoker
set search_path=''
as $$
declare
  result public.hunt_positions;
begin
  update public.hunt_positions position set assigned_participant_id=participant.id
  from public.hunt_drives drive
  join public.hunts hunt on hunt.id=drive.hunt_id
  join public.hunt_participants participant on participant.hunt_id=hunt.id
  where position.id=target_position_id
    and position.drive_id=drive.id
    and position.assigned_participant_id is null
    and hunt.status<>'finished'
    and hunt.allow_self_selection
    and participant.user_id=(select auth.uid())
    and participant.role in ('leader','hunter','guest')
  returning position.* into result;
  if result.id is null then raise exception 'Position is unavailable or self-selection is disabled'; end if;
  return result;
end;
$$;

create or replace function public.confirm_my_hunt_position(
  target_position_id uuid,
  current_location jsonb,
  current_accuracy_m numeric
)
returns public.hunt_positions
language plpgsql
security invoker
set search_path=''
as $$
declare
  participant_id uuid;
  measured_distance numeric;
  result public.hunt_positions;
begin
  if current_accuracy_m<0 or current_accuracy_m>10000 then raise exception 'Invalid accuracy'; end if;
  select participant.id,
    extensions.st_distance(
      extensions.st_setsrid(extensions.st_makepoint(
        (position.location->'coordinates'->>0)::float8,
        (position.location->'coordinates'->>1)::float8),4326)::geography,
      extensions.st_setsrid(extensions.st_makepoint(
        (current_location->'coordinates'->>0)::float8,
        (current_location->'coordinates'->>1)::float8),4326)::geography
    )
  into participant_id,measured_distance
  from public.hunt_positions position
  join public.hunt_drives drive on drive.id=position.drive_id
  join public.hunts hunt on hunt.id=drive.hunt_id
  join public.hunt_participants participant on participant.id=position.assigned_participant_id
  where position.id=target_position_id
    and participant.user_id=(select auth.uid())
    and hunt.status in ('active','paused');
  if participant_id is null then raise exception 'Assigned position not found'; end if;
  update public.hunt_positions set confirmed_at=now(),confirmation_accuracy_m=current_accuracy_m,
    confirmation_distance_m=round(measured_distance::numeric,1)
    where id=target_position_id returning * into result;
  update public.hunt_participants set status='at_position' where id=participant_id;
  return result;
end;
$$;

create or replace function public.share_my_hunt_location(
  target_hunt_id uuid,
  current_location jsonb,
  current_accuracy_m numeric,
  current_heading_deg numeric,
  measured_at timestamptz
)
returns public.hunt_locations
language plpgsql
security invoker
set search_path=''
as $$
declare
  participant public.hunt_participants;
  result public.hunt_locations;
begin
  select * into participant from public.hunt_participants
    where hunt_id=target_hunt_id and user_id=(select auth.uid()) limit 1;
  if participant.id is null then raise exception 'You are not a participant in this hunt'; end if;
  if measured_at<now()-interval '5 minutes' or measured_at>now()+interval '1 minute' then
    raise exception 'Location timestamp is invalid';
  end if;
  insert into public.hunt_locations(participant_id,hunt_id,user_id,location,accuracy_m,heading_deg,recorded_at,received_at)
    values(participant.id,target_hunt_id,(select auth.uid()),current_location,current_accuracy_m,current_heading_deg,measured_at,now())
  on conflict(participant_id) do update set location=excluded.location,accuracy_m=excluded.accuracy_m,
    heading_deg=excluded.heading_deg,recorded_at=excluded.recorded_at,received_at=now(),user_id=excluded.user_id,hunt_id=excluded.hunt_id
  returning * into result;
  update public.hunt_participants set status=case when status='at_position' then status else 'moving' end where id=participant.id;
  return result;
end;
$$;

create or replace function public.stop_my_hunt_location(target_hunt_id uuid)
returns void
language sql
security invoker
set search_path=''
as $$
  delete from public.hunt_locations where hunt_id=target_hunt_id and user_id=(select auth.uid());
$$;

revoke all on function public.set_hunt_status(uuid,text) from public,anon;
revoke all on function public.activate_hunt_drive(uuid) from public,anon;
revoke all on function public.finish_hunt_drive(uuid) from public,anon;
revoke all on function public.claim_hunt_position(uuid) from public,anon;
revoke all on function public.confirm_my_hunt_position(uuid,jsonb,numeric) from public,anon;
revoke all on function public.share_my_hunt_location(uuid,jsonb,numeric,numeric,timestamptz) from public,anon;
revoke all on function public.stop_my_hunt_location(uuid) from public,anon;
grant execute on function public.set_hunt_status(uuid,text) to authenticated;
grant execute on function public.activate_hunt_drive(uuid) to authenticated;
grant execute on function public.finish_hunt_drive(uuid) to authenticated;
grant execute on function public.claim_hunt_position(uuid) to authenticated;
grant execute on function public.confirm_my_hunt_position(uuid,jsonb,numeric) to authenticated;
grant execute on function public.share_my_hunt_location(uuid,jsonb,numeric,numeric,timestamptz) to authenticated;
grant execute on function public.stop_my_hunt_location(uuid) to authenticated;

alter table public.hunts replica identity full;
alter table public.hunt_drives replica identity full;
alter table public.hunt_participants replica identity full;
alter table public.hunt_positions replica identity full;
alter table public.hunt_locations replica identity full;

do $$
declare table_name text;
begin
  foreach table_name in array array['hunts','hunt_drives','hunt_participants','hunt_positions','hunt_locations'] loop
    if not exists(
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I',table_name);
    end if;
  end loop;
end $$;
