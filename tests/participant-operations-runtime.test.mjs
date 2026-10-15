import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const dir=new URL('../supabase/migrations/',import.meta.url);
const sql=suffix=>readFileSync(new URL(readdirSync(dir).find(p=>p.endsWith(suffix)),dir),'utf8');
const id=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
async function fixture(){const db=new PGlite();await db.exec(`
 create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.memberships(user_id uuid primary key,role text,active boolean);
 create function public.my_role() returns text language sql stable security definer set search_path='' as $$select role from public.memberships where user_id=auth.uid() and active$$;
 insert into auth.users values('${id(1)}'),('${id(2)}'),('${id(3)}'),('${id(4)}'),('${id(5)}');
 insert into memberships values('${id(1)}','admin',true),('${id(2)}','member',true),('${id(3)}','member',true),('${id(4)}','viewer',true),('${id(5)}','member',false);
 `);await db.exec(sql('_initial_hunt_planning.sql'));
 await db.exec(`create table public.hunt_roster(id uuid);create table public.hunt_locations(id uuid);`);
 await db.exec(sql('_restrict_hunt_leader_roles.sql'));
 await db.exec(`
 create policy positions_update on hunt_positions for update to authenticated using(exists(select 1 from hunt_drives d where d.id=drive_id and can_manage_hunt(d.hunt_id))) with check(exists(select 1 from hunt_drives d where d.id=drive_id and can_manage_hunt(d.hunt_id)));
 drop policy participants_update on hunt_participants;
 create policy participants_update on hunt_participants for update to authenticated using(can_manage_hunt(hunt_id)) with check(can_manage_hunt(hunt_id));
 grant usage on schema auth to authenticated,anon;grant select on memberships to authenticated;
 grant update on hunt_positions to authenticated;
 create unique index one_position_per_person on hunt_positions(drive_id,assigned_participant_id) where assigned_participant_id is not null;
 create function public.confirm_my_hunt_position(uuid,jsonb,numeric) returns public.hunt_positions language sql as $$select null::public.hunt_positions$$;
 insert into hunts(id,title,leader_id,status,allow_self_selection) values('${id(10)}','Test','${id(1)}','active',true),('${id(11)}','Other','${id(1)}','planned',true);
 insert into hunt_drives(id,hunt_id,sequence,title,status) values('${id(20)}','${id(10)}',1,'Drive','active');
 insert into hunt_participants(id,hunt_id,user_id,display_name,role,status) values('${id(30)}','${id(10)}','${id(2)}','One','hunter','present'),('${id(31)}','${id(10)}','${id(3)}','Two','hunter','present'),('${id(32)}','${id(11)}','${id(1)}','Other','hunter','present');
 insert into hunt_positions(id,drive_id,number,location) values('${id(40)}','${id(20)}',1,'{"type":"Point","coordinates":[24,58]}'),('${id(41)}','${id(20)}',2,'{"type":"Point","coordinates":[24,58]}');
 `);await db.exec(sql('_qa_participant_operations.sql'));return db;}
async function as(db,user,fn){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec('set role authenticated');try{return await fn();}finally{await db.exec('reset role');}}
const point=JSON.stringify({type:'Point',coordinates:[24,58]});
test('ordinary participant claims and confirms own position while direct edits remain denied',async()=>{
 const db=await fixture();try{await as(db,id(2),async()=>{
  assert.equal((await db.query('update hunt_positions set number=99 where id=$1 returning id',[id(40)])).rows.length,0);
  const claim=await db.query('select (public.claim_hunt_position($1)).assigned_participant_id as person',[id(40)]);assert.equal(claim.rows[0].person,id(30));
  await db.query('select public.confirm_my_hunt_position($1,$2,15,clock_timestamp())',[id(40),point]);
 });assert.equal((await db.query('select status from hunt_participants where id=$1',[id(30)])).rows[0].status,'at_position');
 assert.equal(Number((await db.query('select confirmation_distance_m as metres from hunt_positions where id=$1',[id(40)])).rows[0].metres),0);
 }finally{await db.close();}
});
test('occupied and duplicate claims, foreign confirmation, poor and old GPS, and inactive users are rejected',async()=>{
 const db=await fixture();try{
  await as(db,id(2),()=>db.query('select public.claim_hunt_position($1)',[id(40)]));
  await as(db,id(2),()=>assert.rejects(db.query('select public.claim_hunt_position($1)',[id(41)]),/already has/));
  await as(db,id(3),()=>assert.rejects(db.query('select public.claim_hunt_position($1)',[id(40)]),/unavailable/));
  await as(db,id(3),()=>assert.rejects(db.query('select public.confirm_my_hunt_position($1,$2,10,clock_timestamp())',[id(40),point]),/Assigned position/));
  await as(db,id(2),async()=>{
   await assert.rejects(db.query('select public.confirm_my_hunt_position($1,$2,60,clock_timestamp())',[id(40),point]),/accuracy/);
   await assert.rejects(db.query("select public.confirm_my_hunt_position($1,$2,10,clock_timestamp()-interval '1 minute')",[id(40),point]),/Fresh GPS/);
   await assert.rejects(db.query('select public.confirm_my_hunt_position($1,$2,10,clock_timestamp())',[id(40),'{"type":"Point","coordinates":[200,58]}']),/Invalid GPS/);
  });
  for(const user of [id(4),id(5),id(99)])await as(db,user,()=>assert.rejects(db.query('select public.claim_hunt_position($1)',[id(41)]),/membership/));
  await db.exec('set role anon');await assert.rejects(db.query('select public.claim_hunt_position($1)',[id(41)]),/permission denied/);await db.exec('reset role');
 }finally{await db.close();}
});
test('placement is atomic, manager-only and rejects participants from another hunt',async()=>{
 const db=await fixture();try{
  await as(db,id(2),()=>assert.rejects(db.query('select public.place_hunt_participant($1,$2,$3)',[id(20),id(30),point]),/permission/));
  await as(db,id(1),async()=>{
   await assert.rejects(db.query('select public.place_hunt_participant($1,$2,$3)',[id(20),id(32),point]),/does not belong/);
   const result=await db.query('select (public.place_hunt_participant($1,$2,$3)).location as location',[id(20),id(30),'{"type":"Point","coordinates":[25,59]}']);assert.deepEqual(result.rows[0].location.coordinates,[25,59]);
   await assert.rejects(db.query('select public.place_hunt_participant($1,$2,$3)',[id(20),id(30),point]),/already has/);
  });
  assert.equal((await db.query('select count(*)::int as n from hunt_positions where assigned_participant_id=$1',[id(30)])).rows[0].n,1);
 }finally{await db.close();}
});
