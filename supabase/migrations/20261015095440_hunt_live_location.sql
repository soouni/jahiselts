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
