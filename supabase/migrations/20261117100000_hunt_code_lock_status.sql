-- Jahikood: üldpiiri ületamine eristatakse aadressi piirist. Külaline, kes
-- sisestab õige koodi ajal, mil kogu süsteem on valede katsete tõttu lukus,
-- saab selge teate (`locked`), mitte "liiga palju valesid katseid".
-- Üldpiir tõstetakse 40-lt 60-le valele katsele tunnis: ühe aadressi piir
-- (5 katset 15 minutis) jääb samaks, nii et pahatahtlik lukustamine nõuab
-- vähemalt kolme erinevat võrguaadressi, lukk lõpeb tunni möödudes ise.
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
    where l.expires_at > now() and l.bucket = ip_bucket and l.attempts >= 5
  ) then
    return jsonb_build_object('status', 'throttled');
  end if;
  if exists (
    select 1 from public.hunt_code_limits l
    where l.expires_at > now() and l.bucket = 'global' and l.attempts >= 60
  ) then
    return jsonb_build_object('status', 'locked');
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

revoke all on function public.redeem_hunt_access_code(text, text) from public, anon, authenticated;
grant execute on function public.redeem_hunt_access_code(text, text) to service_role;
