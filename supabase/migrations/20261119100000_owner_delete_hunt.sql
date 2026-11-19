-- Omanik saab jahi lõplikult kustutada. Tavakasutajatelt on `hunts` ja
-- `hunt_drives` DELETE-õigus tahtlikult ära võetud, seetõttu käib kustutamine
-- ühe kitsa funktsiooni kaudu, mis kontrollib omaniku rolli ja jahi olekut.
-- Seotud ajud, osalejad, positsioonid, asukohad ja jahikoodid kustuvad
-- võõrvõtmete `on delete cascade` kaudu. Kustutamine jäetakse auditisse.

create or replace function public.delete_hunt(target_hunt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.hunts%rowtype;
  actor_label text;
  drive_count integer;
  person_count integer;
begin
  if auth.uid() is null
     or not exists (
       select 1 from public.memberships m
       where m.user_id = auth.uid() and m.role = 'owner' and m.active = true
     ) then
    raise exception 'Jahti saab kustutada ainult omanik' using errcode = '42501';
  end if;

  select * into target from public.hunts where id = target_hunt_id for update;
  if not found then
    raise exception 'Jahti ei leitud' using errcode = 'P0002';
  end if;
  if target.status = 'active' then
    raise exception 'Aktiivset jahti ei saa kustutada. Lõpeta või peata see enne.' using errcode = '55000';
  end if;

  select count(*) into drive_count from public.hunt_drives where hunt_id = target.id;
  select count(*) into person_count from public.hunt_participants where hunt_id = target.id;
  select m.display_name into actor_label from public.memberships m where m.user_id = auth.uid() and m.active = true limit 1;

  insert into public.audit_events(kind, entry_id, action, actor, actor_name, before_data)
  values ('hunt', target.id, 'Jaht kustutatud', auth.uid(), actor_label,
          jsonb_build_object('title', target.title, 'status', target.status, 'created_at', target.created_at,
                             'drives', drive_count, 'participants', person_count));

  delete from public.hunts where id = target.id;

  return jsonb_build_object('title', target.title, 'drives', drive_count, 'participants', person_count);
end;
$$;

revoke execute on function public.delete_hunt(uuid) from public, anon;
grant execute on function public.delete_hunt(uuid) to authenticated;
