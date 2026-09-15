-- Additive rollout; existing email/password login and accounts remain unchanged.
begin;
alter table public.memberships add column username text;
alter table public.memberships add constraint memberships_username_format check(username is null or username ~ '^[a-z0-9][a-z0-9._-]{2,29}$');
create unique index memberships_username_unique on public.memberships(username) where username is not null;
grant update(username) on public.memberships to authenticated;
create policy member_update_own_username on public.memberships for update to authenticated
 using(user_id=(select auth.uid()) and active)
 with check(user_id=(select auth.uid()) and active);

create table public.username_login_limits(
 bucket text primary key,
 attempts integer not null,
 expires_at timestamptz not null
);
alter table public.username_login_limits enable row level security;
revoke all on public.username_login_limits from public,anon,authenticated;
grant select,insert,update,delete on public.username_login_limits to service_role;
create index username_login_limits_expiry on public.username_login_limits(expires_at);
create function public.consume_username_login_attempt(ip_hash text,name_hash text) returns boolean
 language plpgsql security invoker set search_path='' as $$
declare k text;n integer;ok boolean:=true;
begin
 if ip_hash !~ '^[a-f0-9]{64}$' or name_hash !~ '^[a-f0-9]{64}$' then return false;end if;
 delete from public.username_login_limits where expires_at<now()-interval '1 day';
 foreach k in array array['global','ip:'||ip_hash,'name:'||name_hash] loop
  insert into public.username_login_limits as l(bucket,attempts,expires_at) values(k,1,now()+interval '15 minutes')
  on conflict(bucket) do update set attempts=case when l.expires_at<=now() then 1 else l.attempts+1 end,
   expires_at=case when l.expires_at<=now() then now()+interval '15 minutes' else l.expires_at end
  returning attempts into n;
  if n>(case when k='global' then 300 when k like 'ip:%' then 40 else 10 end) then ok:=false;end if;
 end loop;
 return ok;
end $$;
revoke all on function public.consume_username_login_attempt(text,text) from public,anon,authenticated;
grant execute on function public.consume_username_login_attempt(text,text) to service_role;
commit;
