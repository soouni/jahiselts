-- Atomic counters replace the count-then-insert limiter. Separate account
-- and IP buckets prevent changing one dimension from resetting the other.
create table if not exists public.username_login_limits (
  bucket text primary key,
  attempts integer not null,
  expires_at timestamptz not null
);
alter table public.username_login_limits enable row level security;
revoke all on public.username_login_limits from public, anon, authenticated;
grant select, insert, update, delete on public.username_login_limits to service_role;
create index if not exists username_login_limits_expiry on public.username_login_limits(expires_at);

create or replace function public.consume_username_login_attempt(ip_hash text, name_hash text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  bucket_key text;
  attempt_count integer;
  attempt_limit integer;
begin
  if ip_hash is null or name_hash is null
    or ip_hash !~ '^[a-f0-9]{64}$' or name_hash !~ '^[a-f0-9]{64}$' then
    return false;
  end if;
  delete from public.username_login_limits where expires_at < now() - interval '1 day';
  foreach bucket_key in array array['global', 'ip:' || ip_hash, 'name:' || name_hash] loop
    insert into public.username_login_limits as limits(bucket, attempts, expires_at)
      values(bucket_key, 1, now() + interval '15 minutes')
    on conflict(bucket) do update set
      attempts = case when limits.expires_at <= now() then 1 else limits.attempts + 1 end,
      expires_at = case when limits.expires_at <= now() then now() + interval '15 minutes' else limits.expires_at end
    returning attempts into attempt_count;
    attempt_limit := case when bucket_key = 'global' then 300 when bucket_key like 'ip:%' then 40 else 10 end;
    if attempt_count > attempt_limit then return false; end if;
  end loop;
  return true;
end;
$$;

create or replace function public.clear_username_login_attempts(ip_hash text, name_hash text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if ip_hash is null or name_hash is null
    or ip_hash !~ '^[a-f0-9]{64}$' or name_hash !~ '^[a-f0-9]{64}$' then return; end if;
  delete from public.username_login_limits
    where bucket in ('ip:' || ip_hash, 'name:' || name_hash);
end;
$$;

revoke all on function public.consume_username_login_attempt(text, text) from public, anon, authenticated;
revoke all on function public.clear_username_login_attempts(text, text) from public, anon, authenticated;
grant execute on function public.consume_username_login_attempt(text, text) to service_role;
grant execute on function public.clear_username_login_attempts(text, text) to service_role;
