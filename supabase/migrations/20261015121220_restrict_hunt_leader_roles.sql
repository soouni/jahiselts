-- Prevent an active viewer from being promoted to hunt leader.
-- Hunt leaders are allowed to manage a hunt through can_manage_hunt(), so
-- assigning a viewer would otherwise escalate their permissions.
create or replace function public.can_manage_hunt(target_hunt_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.hunts h
    join public.memberships m on m.user_id = (select auth.uid())
    where h.id = target_hunt_id
      and h.status <> 'finished'
      and m.active = true
      and (
        m.role in ('owner', 'admin')
        or (m.role = 'member' and h.leader_id = (select auth.uid()))
      )
  );
$$;

revoke all on function public.can_manage_hunt(uuid) from public, anon;
grant execute on function public.can_manage_hunt(uuid) to authenticated;

create or replace function public.assign_hunt_leader(
  target_hunt_id uuid,
  new_leader_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role text := public.my_role();
  target_role text;
begin
  if auth.uid() is null or actor_role is null or actor_role not in ('owner', 'admin') then
    raise exception 'Jahijuhti saab määrata ainult omanik või administraator'
      using errcode = '42501';
  end if;

  select m.role into target_role
  from public.memberships m
  where m.user_id = new_leader_id
    and m.active = true
    and m.role in ('owner', 'admin', 'member')
  for key share;

  if target_role is null then
    raise exception 'Jahijuht peab olema aktiivne omanik, administraator või liige'
      using errcode = '42501';
  end if;

  update public.hunts
  set leader_id = new_leader_id
  where id = target_hunt_id
    and status <> 'finished';

  if not found then
    raise exception 'Jahti ei leitud või see on juba lõpetatud';
  end if;
end;
$$;

revoke all on function public.assign_hunt_leader(uuid, uuid) from public, anon;
grant execute on function public.assign_hunt_leader(uuid, uuid) to authenticated;

-- Supabase's default grants leave API roles with broad table privileges.
-- RLS protects row operations, but TRUNCATE bypasses RLS entirely. These
-- tables are only used by signed-in members, so remove anonymous access and
-- strip table-level privileges the client does not need.
revoke all on table
  public.hunts,
  public.hunt_drives,
  public.hunt_participants,
  public.hunt_positions,
  public.hunt_roster,
  public.hunt_locations
from anon;

revoke truncate, references, trigger on table
  public.hunts,
  public.hunt_drives,
  public.hunt_participants,
  public.hunt_positions,
  public.hunt_roster,
  public.hunt_locations
from authenticated;

revoke delete on table public.hunts, public.hunt_drives from authenticated;
