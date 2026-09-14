-- Pärnjõe jahiselts. Run as database owner. No public registration or first-user admin.
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create table public.memberships (
 email text primary key check(email=lower(trim(email))),
 user_id uuid unique references auth.users(id) on delete set null,
 display_name text not null check(length(display_name) between 1 and 150),
 role text not null check(role in ('admin','member','viewer')),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.club_settings (
 id boolean primary key default true check(id),
 name text not null default 'Pärnjõe jahiselts',
 viewer_layers text[] not null default array['area','line','place','observation','sign'],
 check(viewer_layers <@ array['area','line','place','observation','sign']::text[])
);
insert into public.club_settings(id) values(true);
create table public.hunting_areas(code text primary key, name text not null, active_version uuid);
create table public.boundary_versions (
 id uuid primary key default gen_random_uuid(),area_code text not null references public.hunting_areas,
 geom extensions.geometry(MultiPolygon,3301) not null,
 original_response jsonb not null, source_url text not null, source_version text,
 retrieved_at timestamptz not null, checked_at timestamptz not null default now(),
 approved_at timestamptz,source_sha256 text not null,check(extensions.st_isvalid(geom))
);
alter table public.hunting_areas add foreign key(active_version) references public.boundary_versions;
create table public.map_objects(
 id uuid primary key,kind text not null check(kind in ('area','line','place')),
 properties jsonb not null,geom extensions.geometry(Geometry,3301) not null,
 created_by uuid not null,created_at timestamptz not null default now(),
 updated_by uuid not null,updated_at timestamptz not null default now(),
 version integer not null default 1,deleted_at timestamptz,deleted_by uuid,
 check(extensions.st_isvalid(geom)),check(not extensions.st_isempty(geom)),
 check((kind='area' and extensions.geometrytype(geom) in ('POLYGON','MULTIPOLYGON')) or (kind='line' and extensions.geometrytype(geom)='LINESTRING') or (kind='place' and extensions.geometrytype(geom)='POINT'))
);
create table public.observations(
 id uuid primary key,kind text not null default 'observation' check(kind='observation'),
 properties jsonb not null,geom extensions.geometry(Point,3301) not null,
 created_by uuid not null,created_at timestamptz not null default now(),
 updated_by uuid not null,updated_at timestamptz not null default now(),
 version integer not null default 1,deleted_at timestamptz,deleted_by uuid,
 check(extensions.st_isvalid(geom)),check(not extensions.st_isempty(geom))
);
create table public.sign_reports(
 id uuid primary key,kind text not null default 'sign' check(kind='sign'),
 properties jsonb not null,geom extensions.geometry(Geometry,3301) not null,
 created_by uuid not null,created_at timestamptz not null default now(),
 updated_by uuid not null,updated_at timestamptz not null default now(),
 version integer not null default 1,deleted_at timestamptz,deleted_by uuid,
 check(extensions.st_isvalid(geom)),check(not extensions.st_isempty(geom)),
 check(extensions.geometrytype(geom) in ('POINT','LINESTRING'))
);
create index map_objects_geom on public.map_objects using gist(geom);
create index observations_geom on public.observations using gist(geom);
create index sign_reports_geom on public.sign_reports using gist(geom);
create index observations_species_time on public.observations((properties->>'species'),(properties->>'observed_at')) where deleted_at is null;
create index signs_species_time on public.sign_reports((properties->>'species'),(properties->>'observed_at')) where deleted_at is null;
create table public.attachments(id uuid primary key default gen_random_uuid(),entry_id uuid not null,kind text not null check(kind in('observation','sign')),path text unique not null,created_by uuid not null default auth.uid(),created_at timestamptz not null default now());
create table public.audit_events(id bigint generated always as identity primary key,kind text not null,entry_id uuid,action text not null,actor uuid,actor_name text,occurred_at timestamptz not null default now(),before_data jsonb,after_data jsonb);
create table public.boundary_sync_runs(id bigint generated always as identity primary key,occurred_at timestamptz not null default now(),success boolean not null,detail text);

create function public.my_role() returns text language sql stable security definer set search_path='' as $$select role from public.memberships where user_id=auth.uid() and active$$;
create function public.member_name(uid uuid) returns text language sql stable security definer set search_path='' as $$select case when public.my_role() is not null then coalesce((select display_name from public.memberships where user_id=uid),'Endine liige') else null end$$;
create function public.can_read_layer(k text) returns boolean language sql stable security definer set search_path='' as $$select coalesce(public.my_role() in('admin','member') or (public.my_role()='viewer' and exists(select 1 from public.club_settings where id and k=any(viewer_layers))),false)$$;
create function public.feature_table(k text) returns text language sql immutable set search_path='' as $$select case when k in ('area','line','place') then 'public.map_objects' when k='observation' then 'public.observations' when k='sign' then 'public.sign_reports' else null end$$;
create function public.can_access_feature(k text, fid uuid, writing boolean default false) returns boolean language plpgsql stable security definer set search_path='' as $$
declare r record;t text:=public.feature_table(k);role_name text:=public.my_role();
begin
 if t is null or role_name is null then return false;end if;
 execute format('select created_by,deleted_at from %s where id=$1 and kind=$2',t) into r using fid,k;
 if r.created_by is null then return false;end if;
 if writing then return r.deleted_at is null and (role_name='admin' or (role_name='member' and k in('observation','sign') and r.created_by=auth.uid()));end if;
 return public.can_read_layer(k) and (r.deleted_at is null or role_name='admin');
end $$;

alter table public.memberships enable row level security;
alter table public.club_settings enable row level security;
alter table public.map_objects enable row level security;
alter table public.observations enable row level security;
alter table public.sign_reports enable row level security;
alter table public.attachments enable row level security;
alter table public.audit_events enable row level security;
alter table public.hunting_areas enable row level security;
alter table public.boundary_versions enable row level security;
alter table public.boundary_sync_runs enable row level security;
create policy members_read on public.memberships for select to authenticated using(user_id=auth.uid() or public.my_role()='admin');
create policy settings_read on public.club_settings for select to authenticated using(public.my_role() is not null);
create policy map_read on public.map_objects for select to authenticated using(public.can_read_layer(kind) and (deleted_at is null or public.my_role()='admin'));
create policy observations_read on public.observations for select to authenticated using(public.can_read_layer(kind) and (deleted_at is null or public.my_role()='admin'));
create policy signs_read on public.sign_reports for select to authenticated using(public.can_read_layer(kind) and (deleted_at is null or public.my_role()='admin'));
create policy attachments_read on public.attachments for select to authenticated using(public.can_access_feature(kind,entry_id,false));
create policy attachments_insert on public.attachments for insert to authenticated with check(created_by=auth.uid() and public.can_access_feature(kind,entry_id,true) and path like kind||'/'||entry_id::text||'/%');
create policy audit_read on public.audit_events for select to authenticated using(public.my_role()='admin');
create policy area_read on public.hunting_areas for select to authenticated using(public.my_role() is not null);
create policy boundary_read on public.boundary_versions for select to authenticated using(public.my_role() is not null);
create policy sync_read on public.boundary_sync_runs for select to authenticated using(public.my_role()='admin');
revoke all on public.memberships,public.club_settings,public.map_objects,public.observations,public.sign_reports,public.attachments,public.audit_events,public.hunting_areas,public.boundary_versions,public.boundary_sync_runs from anon,authenticated;
grant select on public.memberships,public.club_settings,public.map_objects,public.observations,public.sign_reports,public.attachments,public.audit_events,public.hunting_areas,public.boundary_versions,public.boundary_sync_runs to authenticated;
grant insert on public.attachments to authenticated;

create function public.join_club() returns setof public.memberships language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then return;end if;
 update public.memberships set user_id=auth.uid() where email=lower(auth.jwt()->>'email') and active and (user_id is null or user_id=auth.uid());
 return query select * from public.memberships where user_id=auth.uid() and active;
end $$;
create function public.list_features(include_deleted boolean default false) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'properties',properties,'geometry',extensions.st_asgeojson(extensions.st_transform(geom,4326),9)::jsonb,'created_by',created_by,'creator_name',public.member_name(created_by),'updater_name',public.member_name(updated_by),'created_at',created_at,'updated_at',updated_at,'version',version,'deleted_at',deleted_at) order by created_at desc),'[]'::jsonb)
 from(select * from public.map_objects union all select * from public.observations union all select * from public.sign_reports) f
 where deleted_at is null or (include_deleted and public.my_role()='admin')
$$;
create function public.save_feature(feature_kind text,feature_id uuid,expected_version integer,feature_properties jsonb,feature_geometry jsonb) returns integer language plpgsql security definer set search_path='' as $$
declare t text:=public.feature_table(feature_kind);r record;role_name text:=public.my_role();g extensions.geometry;input_g extensions.geometry;output_version integer;actor_name text;observed timestamptz;clean jsonb;exists_row boolean;
begin
 if t is null or role_name is null or role_name='viewer' then raise exception 'Tegevus ei ole lubatud';end if;
 if feature_id is null or expected_version is null or expected_version<0 then raise exception 'Puuduv kirje tunnus või versioon';end if;
 if feature_kind in('area','line','place') and role_name<>'admin' then raise exception 'Ainult admin saab kohanimesid muuta';end if;
 if jsonb_typeof(feature_properties)<>'object' or octet_length(feature_properties::text)>15000 then raise exception 'Vigased või liiga mahukad andmed';end if;
 clean=feature_properties - array['created_by','created_at','updated_by','updated_at','role','club_id','observer','outside'];
 if feature_kind in('area','line','place') and (length(trim(coalesce(clean->>'name','')))<1 or length(clean->>'name')>150) then raise exception 'Sisesta nimi (kuni 150 märki)';end if;
 if feature_kind in('observation','sign') then
  if coalesce(clean->>'species','')='' then raise exception 'Vali loomaliik';end if;
  if clean->>'species'='Muu' and coalesce(trim(clean->>'other_species'),'')='' then raise exception 'Täpsusta muu liik';end if;
  observed=(clean->>'observed_at')::timestamptz;
  if observed is null or observed>now()+interval '10 minutes' then raise exception 'Kontrolli sündmuse kuupäeva ja kellaaega';end if;
  if feature_kind='observation' and (coalesce(clean->>'count','')!~'^[0-9]+$' or (clean->>'count')::numeric not between 1 and 100000) then raise exception 'Loomade arv peab olema positiivne täisarv';end if;
  if feature_kind='sign' and coalesce(clean->>'sign_type','')='' then raise exception 'Vali ulukimärgi tüüp';end if;
  if clean->>'direction' is not null and (clean->>'direction')::numeric not between 0 and 359 then raise exception 'Suund peab olema vahemikus 0 kuni 359';end if;
 end if;
 input_g=extensions.st_setsrid(extensions.st_geomfromgeojson(feature_geometry::text),4326);
 if extensions.st_isempty(input_g) or extensions.st_ndims(input_g)<>2 or extensions.st_npoints(input_g)>20000 or extensions.st_xmin(input_g::extensions.box3d)<-180 or extensions.st_xmax(input_g::extensions.box3d)>180 or extensions.st_ymin(input_g::extensions.box3d)<-85 or extensions.st_ymax(input_g::extensions.box3d)>85 then raise exception 'Vigane geomeetria';end if;
 g=extensions.st_transform(input_g,3301);
 if not extensions.st_isvalid(g) then raise exception 'Geomeetria on vigane. Kontrolli, et piir ei lõikaks iseennast.';end if;
 if not ((feature_kind='area' and extensions.geometrytype(g) in('POLYGON','MULTIPOLYGON')) or (feature_kind='line' and extensions.geometrytype(g)='LINESTRING') or (feature_kind in('place','observation') and extensions.geometrytype(g)='POINT') or (feature_kind='sign' and extensions.geometrytype(g) in('POINT','LINESTRING'))) then raise exception 'Selle kirje geomeetriatüüp ei sobi';end if;
 select display_name into actor_name from public.memberships where user_id=auth.uid() and active;
 execute format('select * from %s where id=$1 and kind=$2 for update',t) into r using feature_id,feature_kind;
 exists_row=r.id is not null;
 if exists_row then
  if r.deleted_at is not null or (role_name<>'admin' and r.created_by<>auth.uid()) then raise exception 'Tegevus ei ole lubatud';end if;
  clean=clean||jsonb_build_object('observer',coalesce(r.properties->>'observer',actor_name));
 else clean=clean||jsonb_build_object('observer',actor_name);end if;
 clean=clean||jsonb_build_object('outside',coalesce((select not extensions.st_covers(b.geom,g) from public.hunting_areas h join public.boundary_versions b on b.id=h.active_version where h.code='JAH1000125'),false));
 if exists_row then
  if expected_version=0 and r.created_by=auth.uid() and clean=r.properties and extensions.st_equals(g,r.geom) then return r.version;end if;
  if r.version<>expected_version then raise exception 'Kirjet on vahepeal muudetud (conflict)';end if;
  execute format('update %s set properties=$1,geom=$2,updated_by=$3,updated_at=now(),version=version+1 where id=$4 returning version',t) into output_version using clean,g,auth.uid(),feature_id;
  insert into public.audit_events(kind,entry_id,action,actor,actor_name,before_data,after_data) values(feature_kind,feature_id,'Muudetud',auth.uid(),actor_name,to_jsonb(r),jsonb_build_object('properties',clean,'geometry',feature_geometry));
 else
  if expected_version<>0 then raise exception 'Kirjet ei leitud või seda on vahepeal muudetud';end if;
  execute format('insert into %s(id,kind,properties,geom,created_by,updated_by) values($1,$2,$3,$4,$5,$5) returning version',t) into output_version using feature_id,feature_kind,clean,g,auth.uid();
  insert into public.audit_events(kind,entry_id,action,actor,actor_name,after_data) values(feature_kind,feature_id,'Lisatud',auth.uid(),actor_name,jsonb_build_object('properties',clean,'geometry',feature_geometry));
 end if;
 return output_version;
end $$;
create function public.set_deleted(feature_kind text,feature_id uuid,expected_version integer,restore boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare t text:=public.feature_table(feature_kind);r record;role_name text:=public.my_role();actor_name text;
begin
 if t is null or role_name is null or role_name='viewer' then raise exception 'Tegevus ei ole lubatud';end if;
 if feature_id is null or expected_version is null or restore is null then raise exception 'Puuduv kirje tunnus või versioon';end if;
 execute format('select * from %s where id=$1 and kind=$2 for update',t) into r using feature_id,feature_kind;
 if r.id is null then raise exception 'Kirjet ei leitud';end if;
 if role_name<>'admin' and (restore or feature_kind in('area','line','place') or r.created_by<>auth.uid()) then raise exception 'Tegevus ei ole lubatud';end if;
 if r.version<>expected_version then raise exception 'Kirjet on vahepeal muudetud (conflict)';end if;
 if restore and r.deleted_at<now()-interval '30 days' then raise exception 'Taastamistähtaeg on möödunud';end if;
 execute format('update %s set deleted_at=$1,deleted_by=$2,updated_by=$3,updated_at=now(),version=version+1 where id=$4',t) using case when restore then null::timestamptz else now() end,case when restore then null::uuid else auth.uid() end,auth.uid(),feature_id;
 select display_name into actor_name from public.memberships where user_id=auth.uid();
 insert into public.audit_events(kind,entry_id,action,actor,actor_name,before_data) values(feature_kind,feature_id,case when restore then 'Taastatud' else 'Kustutatud' end,auth.uid(),actor_name,to_jsonb(r));
end $$;
create function public.admin_member(member_email text,member_name text,member_role text,member_active boolean) returns void language plpgsql security definer set search_path='' as $$
declare e text:=lower(trim(member_email));old public.memberships;
begin
 if public.my_role()<>'admin' or public.my_role() is null then raise exception 'Tegevus ei ole lubatud';end if;
 perform 1 from public.club_settings where id for update;
 select * into old from public.memberships where email=e;
 if old.user_id=auth.uid() and (not member_active or member_role<>'admin') then raise exception 'Enda adminiõigust ei saa siin eemaldada';end if;
 if member_active and not coalesce(old.active,false) and (select count(*) from public.memberships where active)>=30 then raise exception 'Seltsis on juba 30 aktiivset kasutajat';end if;
 if e!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Vigane e-posti aadress';end if;
 insert into public.memberships(email,display_name,role,active) values(e,trim(member_name),member_role,member_active) on conflict(email) do update set display_name=excluded.display_name,role=excluded.role,active=excluded.active;
 insert into public.audit_events(kind,action,actor,actor_name,before_data,after_data) values('membership','Õigused muudetud',auth.uid(),(select display_name from public.memberships where user_id=auth.uid()),to_jsonb(old),jsonb_build_object('email',e,'role',member_role,'active',member_active));
end $$;
create function public.set_viewer_layers(layers text[]) returns void language plpgsql security definer set search_path='' as $$
begin
 if public.my_role()<>'admin' or public.my_role() is null then raise exception 'Tegevus ei ole lubatud';end if;
 if layers is null or not layers <@ array['area','line','place','observation','sign']::text[] then raise exception 'Vigane kihtide valik';end if;
 update public.club_settings set viewer_layers=layers where id;
 insert into public.audit_events(kind,action,actor,actor_name,after_data) values('settings','Vaataja kihid muudetud',auth.uid(),(select display_name from public.memberships where user_id=auth.uid()),to_jsonb(layers));
end $$;
-- Enrolment restriction: configure as the Before User Created Auth Hook.
create function public.before_user_created(event jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.memberships where email=lower(event->'user'->>'email') and active) then return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','See aadress ei kuulu seltsi kasutajate nimekirja.'));end if;
 return '{}'::jsonb;
end $$;
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.my_role(),public.can_read_layer(text),public.can_access_feature(text,uuid,boolean),public.join_club(),public.list_features(boolean),public.save_feature(text,uuid,integer,jsonb,jsonb),public.set_deleted(text,uuid,integer,boolean),public.admin_member(text,text,text,boolean),public.set_viewer_layers(text[]) to authenticated;
grant execute on function public.member_name(uuid) to authenticated;
grant usage on schema extensions to authenticated;
grant execute on function public.before_user_created(jsonb) to supabase_auth_admin;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('photos','photos',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create function public.photo_access(object_name text,writing boolean default false) returns boolean language plpgsql stable security definer set search_path='' as $$
declare bits text[]:=string_to_array(object_name,'/');fid uuid;
begin
 if array_length(bits,1)<>3 or bits[1] not in('observation','sign') then return false;end if;
 begin fid=bits[2]::uuid;exception when invalid_text_representation then return false;end;
 return public.can_access_feature(bits[1],fid,writing);
end $$;
revoke execute on function public.photo_access(text,boolean) from public,anon;
grant execute on function public.photo_access(text,boolean) to authenticated;
create policy photos_select on storage.objects for select to authenticated using(bucket_id='photos' and public.photo_access(name,false));
create policy photos_insert on storage.objects for insert to authenticated with check(bucket_id='photos' and public.photo_access(name,true));
create policy photos_delete on storage.objects for delete to authenticated using(bucket_id='photos' and public.photo_access(name,true));
