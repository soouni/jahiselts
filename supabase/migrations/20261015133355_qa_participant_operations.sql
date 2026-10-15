-- Self-service actions expose only the intended column changes. Broad UPDATE
-- policies remain manager-only. Privileged implementations stay outside public.
create schema if not exists hunt_private;
grant usage on schema hunt_private to authenticated;

create or replace function hunt_private.require_hunt_point(point jsonb)
returns void language plpgsql immutable security invoker set search_path='' as $$
begin
 if point is null or point->>'type' is distinct from 'Point'
    or jsonb_typeof(point->'coordinates') is distinct from 'array'
    or jsonb_array_length(point->'coordinates')<>2
    or jsonb_typeof(point->'coordinates'->0) is distinct from 'number'
    or jsonb_typeof(point->'coordinates'->1) is distinct from 'number'
    or not ((point->'coordinates'->>0)::numeric between -180 and 180)
    or not ((point->'coordinates'->>1)::numeric between -90 and 90) then
  raise exception 'Invalid GPS coordinates';
 end if;
end; $$;
revoke all on function hunt_private.require_hunt_point(jsonb) from public,anon;
grant execute on function hunt_private.require_hunt_point(jsonb) to authenticated;

create or replace function hunt_private.claim_own_hunt_position(target_position_id uuid)
returns public.hunt_positions language plpgsql security definer set search_path='' as $$
declare h public.hunts; d public.hunt_drives; p public.hunt_participants; result public.hunt_positions;
begin
 if auth.uid() is null or public.my_role() is null or public.my_role() not in ('owner','admin','member') then raise exception 'Active membership required'; end if;
 select hunt.* into h from public.hunts hunt join public.hunt_drives drive on drive.hunt_id=hunt.id join public.hunt_positions pos on pos.drive_id=drive.id where pos.id=target_position_id for update of hunt;
 if h.id is null or h.status='finished' or not h.allow_self_selection then raise exception 'Self-selection is unavailable'; end if;
 select drive.* into d from public.hunt_drives drive join public.hunt_positions pos on pos.drive_id=drive.id where pos.id=target_position_id;
 if d.status='finished' then raise exception 'Drive is finished'; end if;
 select * into p from public.hunt_participants where hunt_id=h.id and user_id=auth.uid() and status<>'left' and role in ('leader','hunter','guest') for update;
 if p.id is null then raise exception 'Participant not found'; end if;
 if exists(select 1 from public.hunt_positions where drive_id=d.id and assigned_participant_id=p.id) then raise exception 'Participant already has a position'; end if;
 update public.hunt_positions set assigned_participant_id=p.id,confirmed_at=null,confirmation_accuracy_m=null,confirmation_distance_m=null where id=target_position_id and assigned_participant_id is null returning * into result;
 if result.id is null then raise exception 'Position is unavailable'; end if;
 return result;
end; $$;
revoke all on function hunt_private.claim_own_hunt_position(uuid) from public,anon;
grant execute on function hunt_private.claim_own_hunt_position(uuid) to authenticated;
create or replace function public.claim_hunt_position(target_position_id uuid)
returns public.hunt_positions language sql security invoker set search_path='' as $$select hunt_private.claim_own_hunt_position(target_position_id)$$;
revoke all on function public.claim_hunt_position(uuid) from public,anon;
grant execute on function public.claim_hunt_position(uuid) to authenticated;

create or replace function hunt_private.confirm_own_hunt_position(target_position_id uuid,current_location jsonb,current_accuracy_m numeric,measured_at timestamptz)
returns public.hunt_positions language plpgsql security definer set search_path='' as $$
declare h public.hunts; d public.hunt_drives; p public.hunt_participants; result public.hunt_positions; a double precision; distance_m numeric;
begin
 if auth.uid() is null or public.my_role() is null or public.my_role() not in ('owner','admin','member') then raise exception 'Active membership required'; end if;
 perform hunt_private.require_hunt_point(current_location);
 if current_accuracy_m is null or not (current_accuracy_m between 0 and 50) then raise exception 'GPS accuracy must be within 50 metres'; end if;
 if measured_at is null or measured_at<clock_timestamp()-interval '30 seconds' or measured_at>clock_timestamp()+interval '5 seconds' then raise exception 'Fresh GPS measurement required'; end if;
 select hunt.* into h from public.hunts hunt join public.hunt_drives drive on drive.hunt_id=hunt.id join public.hunt_positions pos on pos.drive_id=drive.id where pos.id=target_position_id for update of hunt;
 if h.id is null or h.status not in ('active','paused') then raise exception 'Hunt is not active'; end if;
 select drive.* into d from public.hunt_drives drive join public.hunt_positions pos on pos.drive_id=drive.id where pos.id=target_position_id;
 if d.status<>'active' then raise exception 'Drive is not active'; end if;
 select * into p from public.hunt_participants where hunt_id=h.id and user_id=auth.uid() and status<>'left' for update;
 select * into result from public.hunt_positions where id=target_position_id for update;
 if p.id is null or result.assigned_participant_id is distinct from p.id then raise exception 'Assigned position not found'; end if;
 -- Great-circle distance in metres; clamped to avoid rounding outside asin's domain.
 a=power(sin(radians(((current_location->'coordinates'->>1)::float8-(result.location->'coordinates'->>1)::float8)/2)),2)+cos(radians((result.location->'coordinates'->>1)::float8))*cos(radians((current_location->'coordinates'->>1)::float8))*power(sin(radians(((current_location->'coordinates'->>0)::float8-(result.location->'coordinates'->>0)::float8)/2)),2);
 distance_m=round((6371000*2*asin(sqrt(least(1.0,greatest(0.0,a)))))::numeric,1);
 update public.hunt_positions set confirmed_at=now(),confirmation_accuracy_m=current_accuracy_m,confirmation_distance_m=distance_m where id=target_position_id returning * into result;
 update public.hunt_participants set status='at_position' where id=p.id;
 return result;
end; $$;
revoke all on function hunt_private.confirm_own_hunt_position(uuid,jsonb,numeric,timestamptz) from public,anon;
grant execute on function hunt_private.confirm_own_hunt_position(uuid,jsonb,numeric,timestamptz) to authenticated;
-- Retire the old timestamp-less endpoint; it could confirm an arbitrarily old fix.
drop function public.confirm_my_hunt_position(uuid,jsonb,numeric);
create function public.confirm_my_hunt_position(target_position_id uuid,current_location jsonb,current_accuracy_m numeric,measured_at timestamptz)
returns public.hunt_positions language sql security invoker set search_path='' as $$select hunt_private.confirm_own_hunt_position(target_position_id,current_location,current_accuracy_m,measured_at)$$;
revoke all on function public.confirm_my_hunt_position(uuid,jsonb,numeric,timestamptz) from public,anon;
grant execute on function public.confirm_my_hunt_position(uuid,jsonb,numeric,timestamptz) to authenticated;

create or replace function public.place_hunt_participant(target_drive_id uuid,target_participant_id uuid,new_location jsonb)
returns public.hunt_positions language plpgsql security invoker set search_path='' as $$
declare h public.hunts; target public.hunt_positions;
begin
 select hunt.* into h from public.hunts hunt join public.hunt_drives drive on drive.hunt_id=hunt.id where drive.id=target_drive_id for update of hunt;
 if h.id is null or not public.can_manage_hunt(h.id) then raise exception 'Hunt management permission required'; end if;
 if exists(select 1 from public.hunt_drives where id=target_drive_id and status='finished') then raise exception 'Drive is finished'; end if;
 perform hunt_private.require_hunt_point(new_location);
 perform 1 from public.hunt_participants where id=target_participant_id and hunt_id=h.id and status<>'left' for update;
 if not found then raise exception 'Participant does not belong to this hunt'; end if;
 if exists(select 1 from public.hunt_positions where drive_id=target_drive_id and assigned_participant_id=target_participant_id) then raise exception 'Participant already has a position'; end if;
 select * into target from public.hunt_positions where drive_id=target_drive_id and assigned_participant_id is null order by number limit 1 for update;
 if target.id is not null then
  update public.hunt_positions set assigned_participant_id=target_participant_id,location=new_location,confirmed_at=null,confirmation_accuracy_m=null,confirmation_distance_m=null where id=target.id returning * into target;
 else
  insert into public.hunt_positions(drive_id,number,location,assigned_participant_id) select target_drive_id,coalesce(max(number),0)+1,new_location,target_participant_id from public.hunt_positions where drive_id=target_drive_id returning * into target;
 end if;
 return target;
end; $$;
revoke all on function public.place_hunt_participant(uuid,uuid,jsonb) from public,anon;
grant execute on function public.place_hunt_participant(uuid,uuid,jsonb) to authenticated;
