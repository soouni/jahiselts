alter table public.hunt_drives add column if not exists area_geojson jsonb;
create or replace function public.set_hunt_drive_area(target_drive_id uuid, new_area jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare target_hunt uuid;
begin
 select hunt_id into target_hunt from public.hunt_drives where id=target_drive_id;
 if target_hunt is null or not public.can_manage_hunt(target_hunt) then
  raise exception 'Aju ala muutmiseks puudub õigus.' using errcode='42501';
 end if;
 if new_area is not null and (
   jsonb_typeof(new_area) <> 'object' or new_area->>'type' <> 'Polygon'
   or jsonb_typeof(new_area->'coordinates') <> 'array'
   or jsonb_array_length(new_area->'coordinates') <> 1
   or jsonb_array_length(new_area->'coordinates'->0) < 4
   or jsonb_array_length(new_area->'coordinates'->0) > 251
 ) then raise exception 'Vigane aju ala polügoon.'; end if;
 update public.hunt_drives set area_geojson=new_area where id=target_drive_id;
end;$$;
revoke all on function public.set_hunt_drive_area(uuid,jsonb) from public;
grant execute on function public.set_hunt_drive_area(uuid,jsonb) to authenticated;
