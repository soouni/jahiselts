-- Kogunemiskoht ja -aeg: jahijuht sisestab need jahi juurde, jahikoodiga
-- külaline näeb neid oma vaates. Väljad on vabatahtlikud ja lisanduvad
-- olemasolevale tabelile, seega varasemad jahid ja vana veebileht töötavad edasi.
alter table public.hunts
  add column if not exists meeting_at timestamptz,
  add column if not exists meeting_point jsonb,
  add column if not exists meeting_note text;

alter table public.hunts drop constraint if exists hunts_meeting_note_length;
alter table public.hunts add constraint hunts_meeting_note_length
  check (meeting_note is null or char_length(meeting_note) between 1 and 200);

-- CASE tagab, et arvuks teisendamist ei proovita enne tüübikontrolli.
alter table public.hunts drop constraint if exists hunts_meeting_point_valid;
alter table public.hunts add constraint hunts_meeting_point_valid check (
  meeting_point is null or case
    when jsonb_typeof(meeting_point) <> 'object' then false
    when meeting_point ->> 'type' is distinct from 'Point' then false
    when jsonb_typeof(meeting_point -> 'coordinates') is distinct from 'array' then false
    when jsonb_array_length(meeting_point -> 'coordinates') <> 2 then false
    when jsonb_typeof(meeting_point -> 'coordinates' -> 0) <> 'number'
      or jsonb_typeof(meeting_point -> 'coordinates' -> 1) <> 'number' then false
    else (meeting_point -> 'coordinates' ->> 0)::numeric between 21 and 29
      and (meeting_point -> 'coordinates' ->> 1)::numeric between 57 and 60
  end
);

-- Külalise vaade saab juurde välja "meeting". Ülejäänu on sama mis migratsioonis
-- 20261116100000: õigused (ainult service_role) säilivad, sest signatuur ei muutu.
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
    'meeting', case
      when hunt.meeting_at is null and hunt.meeting_point is null and hunt.meeting_note is null then null
      else jsonb_build_object('at', hunt.meeting_at, 'coordinates', hunt.meeting_point -> 'coordinates', 'note', hunt.meeting_note)
    end,
    'expires_at', live_code.expires_at,
    'generated_at', now()
  );
end;
$$;

revoke all on function public.hunt_guest_snapshot(uuid) from public, anon, authenticated;
grant execute on function public.hunt_guest_snapshot(uuid) to service_role;
