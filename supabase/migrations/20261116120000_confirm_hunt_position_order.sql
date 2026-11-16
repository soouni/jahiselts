-- Atomically confirm the geographic order of placed hunters in a drive.
-- Unassigned positions and drivers keep their locations; they are numbered after hunters.
create or replace function public.confirm_hunt_position_order(target_drive_id uuid, ordered_position_ids uuid[])
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  hunt_uuid uuid;
  expected_ids uuid[];
  supplied_ids uuid[];
  item record;
  next_number integer := 0;
  temporary_base integer;
begin
  select hunt_id into hunt_uuid from public.hunt_drives where id=target_drive_id for update;
  if hunt_uuid is null or not public.can_manage_hunt(hunt_uuid) then
    raise exception 'Jahijuhi õigus puudub';
  end if;
  if exists(select 1 from public.hunts where id=hunt_uuid and status='finished') then
    raise exception 'Lõpetatud jahi paigutust ei saa muuta';
  end if;
  -- Lock all positions to prevent concurrent reordering.
  perform 1 from public.hunt_positions where drive_id=target_drive_id for update;
  select coalesce(array_agg(p.id order by p.id),array[]::uuid[]) into expected_ids
  from public.hunt_positions p join public.hunt_participants hp on hp.id=p.assigned_participant_id
  where p.drive_id=target_drive_id and hp.role='hunter';
  select coalesce(array_agg(id order by id),array[]::uuid[]) into supplied_ids
  from unnest(ordered_position_ids) id;
  if cardinality(expected_ids)=0 or expected_ids is distinct from supplied_ids then
    raise exception 'Küttide paigutus on muutunud. Laadi paigutus uuesti.';
  end if;
  select coalesce(max(number),0)+count(*)+1 into temporary_base from public.hunt_positions where drive_id=target_drive_id;
  -- Two-phase renumbering avoids transient collisions with UNIQUE(drive_id,number).
  for item in select id,row_number() over(order by number,id) as idx from public.hunt_positions where drive_id=target_drive_id loop
    update public.hunt_positions set number=temporary_base+item.idx where id=item.id;
  end loop;
  for item in select id,ordinality as idx from unnest(ordered_position_ids) with ordinality as t(id,ordinality) loop
    next_number:=next_number+1;
    update public.hunt_positions set number=next_number where id=item.id;
  end loop;
  for item in
    select p.id from public.hunt_positions p
    left join public.hunt_participants hp on hp.id=p.assigned_participant_id
    where p.drive_id=target_drive_id and (hp.role is distinct from 'hunter')
    order by p.number,p.id
  loop
    next_number:=next_number+1;
    update public.hunt_positions set number=next_number where id=item.id;
  end loop;
end $$;
revoke all on function public.confirm_hunt_position_order(uuid,uuid[]) from public,anon;
grant execute on function public.confirm_hunt_position_order(uuid,uuid[]) to authenticated;
