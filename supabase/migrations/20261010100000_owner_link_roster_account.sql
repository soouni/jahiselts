-- Ainult seltsi omanik võib püsiva jahimehe kirje kasutajakontoga siduda.
-- Üks kasutajakonto saab olla seotud ainult ühe püsiva nimekirja kirjega.
create unique index if not exists hunt_roster_unique_linked_user
 on public.hunt_roster(user_id) where user_id is not null;

create or replace function public.owner_link_roster_account(target_roster_id uuid,target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
 old_user_id uuid;
begin
 if auth.uid() is null or not exists (
  select 1 from public.memberships m
  where m.user_id=auth.uid() and m.role='owner'
 ) then
  raise exception 'Kasutajakonto sidumine on lubatud ainult omanikule.' using errcode='42501';
 end if;

 select r.user_id into old_user_id from public.hunt_roster r
 where r.id=target_roster_id for update;
 if not found then raise exception 'Jahimeest ei leitud.'; end if;

 if target_user_id is not null then
  if not exists (select 1 from public.memberships m where m.user_id=target_user_id) then
   raise exception 'Valitud kasutaja ei kuulu seltsi.';
  end if;
  if exists (select 1 from public.hunt_roster r where r.user_id=target_user_id and r.id<>target_roster_id) then
   raise exception 'See kasutajakonto on juba teise jahimehega seotud.';
  end if;
 end if;

 update public.hunt_roster set user_id=target_user_id where id=target_roster_id;
 -- Seos kandub edasi sama püsiva nimekirja kaudu lisatud osalejatele.
 update public.hunt_participants set user_id=target_user_id where roster_id=target_roster_id;
end;
$$;
revoke all on function public.owner_link_roster_account(uuid,uuid) from public;
grant execute on function public.owner_link_roster_account(uuid,uuid) to authenticated;
