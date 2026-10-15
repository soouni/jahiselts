create table if not exists public.hunt_roster(
 id uuid primary key default gen_random_uuid(),
 user_id uuid unique references auth.users(id),
 display_name text not null,
 default_role text not null default 'hunter' check(default_role in ('hunter','driver')),
 created_at timestamptz not null default now()
);
alter table public.hunt_roster enable row level security;
create policy hunt_roster_read on public.hunt_roster for select to authenticated using(exists(select 1 from public.memberships m where m.user_id=(select auth.uid()) and m.active));
create policy hunt_roster_write on public.hunt_roster for all to authenticated using(exists(select 1 from public.memberships m where m.user_id=(select auth.uid()) and m.active and m.role in ('admin','member'))) with check(exists(select 1 from public.memberships m where m.user_id=(select auth.uid()) and m.active and m.role in ('admin','member')));
grant select,insert,update,delete on public.hunt_roster to authenticated;
alter table public.hunt_participants add column if not exists roster_id uuid references public.hunt_roster(id) on delete set null;
create unique index if not exists hunt_participants_unique_roster on public.hunt_participants(hunt_id,roster_id) where roster_id is not null;
