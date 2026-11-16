-- End started hunts at the end of their Estonian local calendar day.
-- Run every five minutes, with the first execution shortly after midnight.
create extension if not exists pg_cron with schema pg_catalog;
create or replace function public.finish_expired_hunts()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare
  hunt_record record;
  closed_count integer := 0;
begin
  for hunt_record in
    select id from public.hunts
    where status in ('active','paused')
      and starts_at is not null
      and (starts_at at time zone 'Europe/Tallinn')::date
          < (now() at time zone 'Europe/Tallinn')::date
    for update skip locked
  loop
    update public.hunts set status='finished',updated_at=now() where id=hunt_record.id;
    update public.hunt_drives
      set status='finished',finished_at=coalesce(finished_at,now()),updated_at=now()
      where hunt_id=hunt_record.id and status<>'finished';
    delete from public.hunt_locations where hunt_id=hunt_record.id;
    closed_count:=closed_count+1;
  end loop;
  return closed_count;
end $$;
revoke all on function public.finish_expired_hunts() from public,anon,authenticated;
grant execute on function public.finish_expired_hunts() to service_role;
select cron.schedule('finish-expired-hunts-estonia','*/5 * * * *','select public.finish_expired_hunts();');
