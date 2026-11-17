-- Jahikood: katsete loendurid suurenevad enne koodi otsingut ja ühe SQL-käsuga.
-- Varem kontrolliti piiri ja suurendati loendurit alles pärast otsingut, nii et
-- paralleelsed päringud nägid kõik sama väikest loendurit ja said ühe aadressi
-- piirist (5 katset 15 minutis) ning üldpiirist (60 tunnis) mööda. Nüüd
-- serialiseerib `insert … on conflict` rea lukk samas ämbris olevad päringud ja
-- iga päring saab oma järjekorranumbri.
-- Õige kood tagastab oma katse (loendurid vähenevad), sest piirid loevad valesid
-- katseid. Piirid ise ei muutu: aadressi piir 5, üldpiir 60.
create or replace function public.redeem_hunt_access_code(submitted_code text, ip_hash text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  ip_bucket text;
  ip_attempts integer;
  global_attempts integer;
  found_code public.hunt_access_codes;
begin
  if submitted_code is null or submitted_code !~ '^[0-9]{4}$'
    or ip_hash is null or ip_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('status', 'invalid');
  end if;
  ip_bucket := 'ip:' || ip_hash;
  delete from public.hunt_code_limits where expires_at < now() - interval '1 day';

  -- Lukud võetakse alati samas järjekorras (aadress, siis üldine), et ei tekiks ummikut.
  insert into public.hunt_code_limits as limits(bucket, attempts, expires_at)
    values (ip_bucket, 1, now() + interval '15 minutes')
  on conflict (bucket) do update set
    attempts = case when limits.expires_at <= now() then 1 else limits.attempts + 1 end,
    expires_at = case when limits.expires_at <= now() then now() + interval '15 minutes' else limits.expires_at end
  returning limits.attempts into ip_attempts;
  if ip_attempts > 5 then
    return jsonb_build_object('status', 'throttled');
  end if;

  insert into public.hunt_code_limits as limits(bucket, attempts, expires_at)
    values ('global', 1, now() + interval '1 hour')
  on conflict (bucket) do update set
    attempts = case when limits.expires_at <= now() then 1 else limits.attempts + 1 end,
    expires_at = case when limits.expires_at <= now() then now() + interval '1 hour' else limits.expires_at end
  returning limits.attempts into global_attempts;
  if global_attempts > 60 then
    -- Sulgemine ei ole selle aadressi süü, seega katset sellele ei arvata.
    update public.hunt_code_limits set attempts = greatest(attempts - 1, 0)
      where bucket = ip_bucket and expires_at > now();
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
    update public.hunt_code_limits set attempts = greatest(attempts - 1, 0)
      where bucket in (ip_bucket, 'global') and expires_at > now();
    return jsonb_build_object('status', 'ok', 'code_id', found_code.id, 'expires_at', found_code.expires_at);
  end if;
  return jsonb_build_object('status', 'invalid');
end;
$$;

revoke all on function public.redeem_hunt_access_code(text, text) from public, anon, authenticated;
grant execute on function public.redeem_hunt_access_code(text, text) to service_role;
