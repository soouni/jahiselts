-- Validate drive-area GeoJSON server-side, including geometry validity and bounds.
create or replace function public.set_hunt_drive_area(target_drive_id uuid, new_area jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
 target_hunt uuid;
 ring jsonb;
 vertex jsonb;
 first_vertex jsonb;
 last_vertex jsonb;
 geom public.geometry;
 x double precision;
 y double precision;
begin
 select hunt_id into target_hunt from public.hunt_drives where id=target_drive_id;
 if target_hunt is null or not public.can_manage_hunt(target_hunt) then
  raise exception 'Aju ala muutmiseks puudub õigus.' using errcode='42501';
 end if;
 if new_area is not null then
  if jsonb_typeof(new_area)<>'object' or new_area->>'type'<>'Polygon'
     or jsonb_typeof(new_area->'coordinates')<>'array'
     or jsonb_array_length(new_area->'coordinates')<>1 then
   raise exception 'Aju ala peab olema ühe välispiiriga GeoJSON Polygon.';
  end if;
  ring:=new_area->'coordinates'->0;
  if jsonb_typeof(ring)<>'array' or jsonb_array_length(ring)<4 or jsonb_array_length(ring)>251 then
   raise exception 'Aju alal peab olema 3 kuni 250 tippu.';
  end if;
  for vertex in select value from jsonb_array_elements(ring) loop
   if jsonb_typeof(vertex)<>'array' or jsonb_array_length(vertex)<>2
      or jsonb_typeof(vertex->0)<>'number' or jsonb_typeof(vertex->1)<>'number' then
    raise exception 'Aju ala koordinaadid peavad olema arvupaarid.';
   end if;
   x:=(vertex->>0)::double precision;y:=(vertex->>1)::double precision;
   if x < -180 or x > 180 or y < -90 or y > 90 then
    raise exception 'Aju ala koordinaadid on väljaspool lubatud vahemikku.';
   end if;
  end loop;
  first_vertex:=ring->0;last_vertex:=ring->(jsonb_array_length(ring)-1);
  if first_vertex<>last_vertex then raise exception 'Aju ala polügoon peab olema suletud.';end if;
  begin
   geom:=public.ST_SetSRID(public.ST_GeomFromGeoJSON(new_area::text),4326);
  exception when others then
   raise exception 'Aju ala GeoJSON geomeetria ei ole korrektne.';
  end;
  if not public.ST_IsValid(geom) or public.ST_IsEmpty(geom) or public.ST_Area(geom::public.geography)<1 then
   raise exception 'Aju ala on vigane, iselõikuv või liiga väike.';
  end if;
 end if;
 update public.hunt_drives set area_geojson=new_area where id=target_drive_id;
end;$$;
revoke all on function public.set_hunt_drive_area(uuid,jsonb) from public;
grant execute on function public.set_hunt_drive_area(uuid,jsonb) to authenticated;
