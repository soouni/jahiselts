create table public.hunts (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title)) between 1 and 120),
 type text not null default 'drive' check(type in ('drive','stand','other')),
 status text not null default 'planned' check(status in ('planned','active','paused','finished')),
 leader_id uuid not null references auth.users(id),
 allow_self_selection boolean not null default false,
 starts_at timestamptz,
 created_at timestamptz not null default now()
);

create table public.hunt_drives (
 id uuid primary key default gen_random_uuid(),
 hunt_id uuid not null references public.hunts(id) on delete cascade,
 sequence integer not null check(sequence>0),
 title text not null check(length(trim(title)) between 1 and 100),
 status text not null default 'planned' check(status in ('planned','ready','active','finished')),
 unique(hunt_id,sequence)
);

create unique index one_active_drive_per_hunt on public.hunt_drives(hunt_id) where status='active';

create table public.hunt_participants (
 id uuid primary key default gen_random_uuid(),
 hunt_id uuid not null references public.hunts(id) on delete cascade,
 user_id uuid references auth.users(id),
 display_name text not null check(length(trim(display_name))>0),
 role text not null check(role in ('leader','hunter','driver','guest')),
 status text not null default 'invited' check(status in ('invited','present','moving','at_position','left')),
 unique(hunt_id,user_id)
);

create table public.hunt_positions (
 id uuid primary key default gen_random_uuid(),
 drive_id uuid not null references public.hunt_drives(id) on delete cascade,
 number integer not null check(number>0),
 location jsonb not null,
 assigned_participant_id uuid references public.hunt_participants(id),
 confirmed_at timestamptz,
 confirmation_accuracy_m numeric,
 confirmation_distance_m numeric,
 unique(drive_id,number),
 constraint valid_point check(location->>'type'='Point' and jsonb_array_length(location->'coordinates')=2)
);

alter table public.hunts enable row level security;
alter table public.hunt_drives enable row level security;
alter table public.hunt_participants enable row level security;
alter table public.hunt_positions enable row level security;

create policy hunts_select on public.hunts for select to authenticated using (
 exists(select 1 from public.memberships m where m.user_id=(select auth.uid()) and m.active=true)
);
create policy hunts_insert on public.hunts for insert to authenticated with check (
 leader_id=(select auth.uid()) and exists(select 1 from public.memberships m where m.user_id=(select auth.uid()) and m.active=true and m.role in ('admin','member'))
);
create policy hunts_update on public.hunts for update to authenticated using (leader_id=(select auth.uid())) with check (leader_id=(select auth.uid()));
create policy drives_select on public.hunt_drives for select to authenticated using (
 exists(select 1 from public.hunts h where h.id=hunt_id)
);
create policy drives_insert on public.hunt_drives for insert to authenticated with check (
 exists(select 1 from public.hunts h where h.id=hunt_id and h.leader_id=(select auth.uid()) and h.status='planned')
);
create policy drives_update on public.hunt_drives for update to authenticated using (
 exists(select 1 from public.hunts h where h.id=hunt_id and h.leader_id=(select auth.uid()))
) with check (
 exists(select 1 from public.hunts h where h.id=hunt_id and h.leader_id=(select auth.uid()))
);
create policy participants_select on public.hunt_participants for select to authenticated using (
 exists(select 1 from public.hunts h where h.id=hunt_id)
);
create policy participants_insert on public.hunt_participants for insert to authenticated with check (
 exists(select 1 from public.hunts h where h.id=hunt_id and h.leader_id=(select auth.uid()))
);
create policy participants_update on public.hunt_participants for update to authenticated using (
 exists(select 1 from public.hunts h where h.id=hunt_id and h.leader_id=(select auth.uid()))
) with check (
 exists(select 1 from public.hunts h where h.id=hunt_id and h.leader_id=(select auth.uid()))
);
create policy positions_select on public.hunt_positions for select to authenticated using (
 exists(select 1 from public.hunt_drives d join public.hunts h on h.id=d.hunt_id where d.id=drive_id)
);
create policy positions_insert on public.hunt_positions for insert to authenticated with check (
 exists(select 1 from public.hunt_drives d join public.hunts h on h.id=d.hunt_id where d.id=drive_id and h.leader_id=(select auth.uid()))
);

grant select,insert,update on public.hunts,public.hunt_drives,public.hunt_participants to authenticated;
grant select,insert on public.hunt_positions to authenticated;
