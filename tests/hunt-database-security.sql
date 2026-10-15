-- Run in a transaction-capable SQL client against a disposable database or as
-- one Supabase execute_sql request. The inner exception rolls back all fixtures.
do $$
declare
 owner_id uuid:=gen_random_uuid();admin_id uuid:=gen_random_uuid();member_id uuid:=gen_random_uuid();inactive_id uuid:=gen_random_uuid();
 roster_id uuid:=gen_random_uuid();roster_two_id uuid:=gen_random_uuid();hunt_id uuid:=gen_random_uuid();drive_id uuid:=gen_random_uuid();participant_id uuid:=gen_random_uuid();
 denied boolean;tests integer:=0;message text;
begin
 begin
  insert into auth.users(id,email,aud,role,raw_app_meta_data,raw_user_meta_data)
  values(owner_id,owner_id||'@test.invalid','authenticated','authenticated','{}','{}'),
        (admin_id,admin_id||'@test.invalid','authenticated','authenticated','{}','{}'),
        (member_id,member_id||'@test.invalid','authenticated','authenticated','{}','{}'),
        (inactive_id,inactive_id||'@test.invalid','authenticated','authenticated','{}','{}');
  insert into public.memberships(email,user_id,display_name,role,active)
  values(owner_id||'@test.invalid',owner_id,'Security owner','owner',true),
        (admin_id||'@test.invalid',admin_id,'Security admin','admin',true),
        (member_id||'@test.invalid',member_id,'Security member','member',true),
        (inactive_id||'@test.invalid',inactive_id,'Security inactive','member',false);
  insert into public.hunt_roster(id,display_name) values(roster_id,'Security roster'),(roster_two_id,'Security roster two');
  insert into public.hunts(id,title,leader_id) values(hunt_id,'Security hunt',admin_id);
  insert into public.hunt_drives(id,hunt_id,sequence,title) values(drive_id,hunt_id,1,'Security drive');
  insert into public.hunt_participants(id,hunt_id,roster_id,display_name,role)
  values(participant_id,hunt_id,roster_id,'Security roster','hunter');

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
  denied:=false;begin perform public.admin_member(gen_random_uuid()||'@test.invalid','Forbidden owner','owner',true);exception when invalid_parameter_value or raise_exception then denied:=true;end;
  if not denied then raise exception 'FAIL admin minted owner';end if;tests:=tests+1;
  denied:=false;begin update public.hunt_roster set user_id=member_id where id=roster_id;exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'FAIL admin direct roster link';end if;tests:=tests+1;
  denied:=false;begin perform public.owner_link_roster_account(roster_id,member_id);exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'FAIL admin owner RPC';end if;tests:=tests+1;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
  perform public.owner_link_roster_account(roster_id,member_id);
  if (select user_id from public.hunt_roster where id=roster_id) is distinct from member_id
     or (select user_id from public.hunt_participants where id=participant_id) is distinct from member_id then
   raise exception 'FAIL owner link propagation';
  end if;tests:=tests+1;
  denied:=false;begin perform public.owner_link_roster_account(roster_two_id,member_id);exception when unique_violation or raise_exception then denied:=true;end;
  if not denied then raise exception 'FAIL duplicate roster link';end if;tests:=tests+1;
  denied:=false;begin perform public.owner_link_roster_account(roster_two_id,inactive_id);exception when raise_exception then denied:=true;end;
  if not denied then raise exception 'FAIL inactive target link';end if;tests:=tests+1;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
  perform public.set_hunt_drive_area(drive_id,'{"type":"Polygon","coordinates":[[[24.86,58.63],[24.861,58.63],[24.861,58.631],[24.86,58.63]]]}');tests:=tests+1;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated')::text,true);
  denied:=false;begin perform public.set_hunt_drive_area(drive_id,null);exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'FAIL unrelated member changed drive area';end if;tests:=tests+1;

  execute 'set local role anon';
  denied:=false;begin perform public.owner_link_roster_account(roster_id,null);exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'FAIL anon owner RPC';end if;tests:=tests+1;
  denied:=false;begin perform public.set_hunt_drive_area(drive_id,null);exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'FAIL anon drive RPC';end if;tests:=tests+1;
  execute 'reset role';

  raise exception using errcode='P0002',message='ROLLBACK_HUNT_SECURITY_FIXTURES';
 exception when no_data_found then
  get stacked diagnostics message=message_text;
  if message<>'ROLLBACK_HUNT_SECURITY_FIXTURES' then raise;end if;
 end;
 if exists(select 1 from auth.users where id in(owner_id,admin_id,member_id,inactive_id)) then raise exception 'FAIL fixture cleanup';end if;
 perform set_config('parnjoe_hunt_security_test.results',jsonb_build_object('passed',tests,'fixtures_persisted',false)::text,false);
end $$;
select current_setting('parnjoe_hunt_security_test.results')::jsonb as hunt_security_checks;
