create table if not exists public.username_login_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  name_hash text not null,
  attempted_at timestamptz not null default now()
);

alter table public.username_login_attempts enable row level security;

revoke all on table public.username_login_attempts from anon;
revoke all on table public.username_login_attempts from authenticated;

create index if not exists username_login_attempts_lookup_idx
  on public.username_login_attempts (ip_hash, name_hash, attempted_at desc);

create or replace function public.consume_username_login_attempt(
  ip_hash text,
  name_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_attempts integer;
begin
  delete from public.username_login_attempts
  where attempted_at < now() - interval '1 day';

  select count(*)
    into recent_attempts
  from public.username_login_attempts
  where username_login_attempts.ip_hash = consume_username_login_attempt.ip_hash
    and username_login_attempts.name_hash = consume_username_login_attempt.name_hash
    and attempted_at >= now() - interval '15 minutes';

  if recent_attempts >= 5 then
    return false;
  end if;

  insert into public.username_login_attempts (ip_hash, name_hash)
  values (consume_username_login_attempt.ip_hash, consume_username_login_attempt.name_hash);

  return true;
end;
$$;

create or replace function public.clear_username_login_attempts(
  ip_hash text,
  name_hash text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.username_login_attempts
  where username_login_attempts.ip_hash = clear_username_login_attempts.ip_hash
    and username_login_attempts.name_hash = clear_username_login_attempts.name_hash;
end;
$$;

revoke all on function public.consume_username_login_attempt(text, text) from public;
revoke all on function public.consume_username_login_attempt(text, text) from anon;
revoke all on function public.consume_username_login_attempt(text, text) from authenticated;

revoke all on function public.clear_username_login_attempts(text, text) from public;
revoke all on function public.clear_username_login_attempts(text, text) from anon;
revoke all on function public.clear_username_login_attempts(text, text) from authenticated;

grant execute on function public.consume_username_login_attempt(text, text) to service_role;
grant execute on function public.clear_username_login_attempts(text, text) to service_role;
