-- Jahikood: lühiajaline neljakohaline kood, millega kontota külaline näeb
-- ühe jahi paigutust. Külaline ei saa Supabase'i seanssi ega ühtki
-- kirjutusõigust: koodi kontrollib ja vaate väljastab ainult Edge Function
-- `hunt-code` teenuserolliga. Olemasolevaid RLS-poliitikaid ei muudeta.

create table if not exists public.hunt_access_codes (
  id uuid primary key default gen_random_uuid(),
  hunt_id uuid not null references public.hunts(id) on delete cascade,
  code text not null check (code ~ '^[0-9]{4}$'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
-- Kehtiv kood peab viitama täpselt ühele jahile ja jahil on üks kehtiv kood.
create unique index if not exists hunt_access_codes_live_code
  on public.hunt_access_codes(code) where revoked_at is null;
create unique index if not exists hunt_access_codes_live_hunt
  on public.hunt_access_codes(hunt_id) where revoked_at is null;

-- Poliitikate puudumine on tahtlik: brauser ei loe tabelit kunagi otse.
alter table public.hunt_access_codes enable row level security;
revoke all on table public.hunt_access_codes from public, anon, authenticated;
grant select, insert, update, delete on table public.hunt_access_codes to service_role;

create table if not exists public.hunt_code_limits (
  bucket text primary key,
  attempts integer not null,
  expires_at timestamptz not null
);
alter table public.hunt_code_limits enable row level security;
revoke all on table public.hunt_code_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.hunt_code_limits to service_role;
create index if not exists hunt_code_limits_expiry on public.hunt_code_limits(expires_at);

-- Jahijuht või admin loob koodi. Varasem sama jahi kood tühistatakse.
create or replace function public.create_hunt_access_code(target_hunt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text;
  valid_until timestamptz := now() + interval '48 hours';
  attempt integer;
begin
  if auth.uid() is null or not public.can_manage_hunt(target_hunt_id) then
    raise exception 'Jahikoodi saab luua ainult jahijuht või administraator'
      using errcode = '42501';
  end if;

  perform 1 from public.hunts where id = target_hunt_id for update;

  update public.hunt_access_codes c
  set revoked_at = now()
  where c.revoked_at is null
    and (
      c.hunt_id = target_hunt_id
      or c.expires_at <= now()
      or exists (select 1 from public.hunts h where h.id = c.hunt_id and h.status = 'finished')
    );

  for attempt in 1..40 loop
    candidate := lpad(((('x' || left(replace(gen_random_uuid()::text, '-', ''), 7))::bit(28)::integer) % 10000)::text, 4, '0');
    -- Kergesti äraarvatavad koodid jäetakse vahele.
    continue when candidate in ('0000','1111','2222','3333','4444','5555','6666','7777','8888','9999','1234','4321','0123','2580');
    begin
      insert into public.hunt_access_codes(hunt_id, code, created_by, expires_at)
      values (target_hunt_id, candidate, auth.uid(), valid_until);
      return jsonb_build_object('code', candidate, 'expires_at', valid_until);
    exception when unique_violation then
      -- Kood on teisel jahil kasutusel: proovi järgmist.
      null;
    end;
  end loop;
  raise exception 'Vaba jahikoodi ei leitud. Proovi uuesti.';
end;
$$;

create or replace function public.get_hunt_access_code(target_hunt_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if auth.uid() is null or not public.can_manage_hunt(target_hunt_id) then
    raise exception 'Jahikoodi näeb ainult jahijuht või administraator'
      using errcode = '42501';
  end if;
  select jsonb_build_object('code', c.code, 'expires_at', c.expires_at) into result
  from public.hunt_access_codes c
  where c.hunt_id = target_hunt_id and c.revoked_at is null and c.expires_at > now();
  return result;
end;
$$;

create or replace function public.revoke_hunt_access_code(target_hunt_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.can_manage_hunt(target_hunt_id) then
    raise exception 'Jahikoodi saab tühistada ainult jahijuht või administraator'
      using errcode = '42501';
  end if;
  update public.hunt_access_codes
  set revoked_at = now()
  where hunt_id = target_hunt_id and revoked_at is null;
end;
$$;

revoke all on function public.create_hunt_access_code(uuid) from public, anon;
revoke all on function public.get_hunt_access_code(uuid) from public, anon;
revoke all on function public.revoke_hunt_access_code(uuid) from public, anon;
grant execute on function public.create_hunt_access_code(uuid) to authenticated;
grant execute on function public.get_hunt_access_code(uuid) to authenticated;
grant execute on function public.revoke_hunt_access_code(uuid) to authenticated;

-- Ainult Edge Function (service_role). Loendatakse ainult valesid katseid,
-- et sama mobiilivõrgu aadressi taga olevad jahimehed üksteist ei lukustaks.
-- Piirid: 5 valet katset 15 minuti jooksul aadressi kohta ja 40 valet katset
-- tunnis kokku. Viimane piirab hajutatud äraarvamist.
create or replace function public.redeem_hunt_access_code(submitted_code text, ip_hash text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  ip_bucket text;
  found_code public.hunt_access_codes;
begin
  if submitted_code is null or submitted_code !~ '^[0-9]{4}$'
    or ip_hash is null or ip_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('status', 'invalid');
  end if;
  ip_bucket := 'ip:' || ip_hash;
  delete from public.hunt_code_limits where expires_at < now() - interval '1 day';

  if exists (
    select 1 from public.hunt_code_limits l
    where l.expires_at > now()
      and ((l.bucket = ip_bucket and l.attempts >= 5) or (l.bucket = 'global' and l.attempts >= 40))
  ) then
    return jsonb_build_object('status', 'throttled');
  end if;

  select c.* into found_code
  from public.hunt_access_codes c
  join public.hunts h on h.id = c.hunt_id
  where c.code = submitted_code
    and c.revoked_at is null
    and c.expires_at > now()
    and h.status <> 'finished';

  if found_code.id is not null then
    return jsonb_build_object('status', 'ok', 'code_id', found_code.id, 'expires_at', found_code.expires_at);
  end if;

  insert into public.hunt_code_limits as limits(bucket, attempts, expires_at)
    values (ip_bucket, 1, now() + interval '15 minutes')
  on conflict (bucket) do update set
    attempts = case when limits.expires_at <= now() then 1 else limits.attempts + 1 end,
    expires_at = case when limits.expires_at <= now() then now() + interval '15 minutes' else limits.expires_at end;
  insert into public.hunt_code_limits as limits(bucket, attempts, expires_at)
    values ('global', 1, now() + interval '1 hour')
  on conflict (bucket) do update set
    attempts = case when limits.expires_at <= now() then 1 else limits.attempts + 1 end,
    expires_at = case when limits.expires_at <= now() then now() + interval '1 hour' else limits.expires_at end;
  return jsonb_build_object('status', 'invalid');
end;
$$;

-- Külalise vaade: ainult jahi nimi, jooksev aju ja paigutatud inimesed.
-- GPS-asukohti, kontosid, e-poste ega perekonnanimesid ei väljastata:
-- nimi lühendatakse kujule "Eesnimi P.".
create or replace function public.hunt_guest_snapshot(target_code_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  live_code public.hunt_access_codes;
  hunt public.hunts;
  drive public.hunt_drives;
  placed jsonb;
begin
  select c.* into live_code from public.hunt_access_codes c
  where c.id = target_code_id and c.revoked_at is null and c.expires_at > now();
  if live_code.id is null then return null; end if;

  select h.* into hunt from public.hunts h where h.id = live_code.hunt_id and h.status <> 'finished';
  if hunt.id is null then return null; end if;

  select d.* into drive from public.hunt_drives d
  where d.hunt_id = hunt.id and d.status <> 'finished'
  order by (d.status = 'active') desc, d.sequence
  limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'number', p.number,
      'coordinates', p.location -> 'coordinates',
      'role', person.role,
      'name', case
        when array_length(parts.words, 1) > 1
          then parts.words[1] || ' ' || left(parts.words[array_length(parts.words, 1)], 1) || '.'
        else coalesce(parts.words[1], '')
      end
    ) order by p.number), '[]'::jsonb) into placed
  from public.hunt_positions p
  join public.hunt_participants person on person.id = p.assigned_participant_id
  cross join lateral (
    select regexp_split_to_array(trim(person.display_name), '\s+') as words
  ) parts
  where p.drive_id = drive.id;

  return jsonb_build_object(
    'hunt', jsonb_build_object('title', hunt.title, 'status', hunt.status),
    'drive', case when drive.id is null then null else jsonb_build_object(
      'sequence', drive.sequence, 'title', drive.title, 'status', drive.status, 'area', drive.area_geojson
    ) end,
    'positions', coalesce(placed, '[]'::jsonb),
    'expires_at', live_code.expires_at,
    'generated_at', now()
  );
end;
$$;

revoke all on function public.redeem_hunt_access_code(text, text) from public, anon, authenticated;
revoke all on function public.hunt_guest_snapshot(uuid) from public, anon, authenticated;
grant execute on function public.redeem_hunt_access_code(text, text) to service_role;
grant execute on function public.hunt_guest_snapshot(uuid) to service_role;
