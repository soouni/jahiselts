import test from 'node:test';
import assert from 'node:assert/strict';
import {createHuntDb} from './helpers/hunt-db.mjs';
test('all hunt migrations replay in filename order without manually created helpers',async()=>{
 const {db,files}=await createHuntDb();try{
 assert.ok(files.some(name=>name.endsWith('_auto_finish_hunts.sql')),'pg_cron migration is replayed too');
 const {rows}=await db.query("select to_regprocedure('public.can_manage_hunt(uuid)')::text as helper,to_regprocedure('public.confirm_my_hunt_position(uuid,jsonb,numeric,timestamp with time zone)')::text as confirmation");
 assert.ok(rows[0].helper);assert.ok(rows[0].confirmation);
 // An owner who is not the leader can manage; an ordinary nonleader cannot.
 await db.exec(`insert into auth.users values('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');insert into memberships values('owner@test.invalid','00000000-0000-0000-0000-000000000001','Owner','owner',true),('member@test.invalid','00000000-0000-0000-0000-000000000002','Member','member',true);insert into hunts(id,title,leader_id) values('00000000-0000-0000-0000-000000000010','Replay','00000000-0000-0000-0000-000000000002');`);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",['00000000-0000-0000-0000-000000000001']);await db.exec('set role authenticated');
 const updated=await db.query("update hunts set title='Owner updated' returning id");assert.equal(updated.rows.length,1);
 // Account-free people must work under the real authenticated RLS policies.
 const roster=await db.query("insert into hunt_roster(display_name,default_role) values('E-postita jahimees','hunter') returning id,user_id");
 assert.equal(roster.rows[0].user_id,null);
 const participant=await db.query("insert into hunt_participants(hunt_id,roster_id,display_name,role) values('00000000-0000-0000-0000-000000000010',$1,'E-postita jahimees','hunter') returning id,user_id",[roster.rows[0].id]);
 assert.equal(participant.rows[0].user_id,null);
 const drive=await db.query("insert into hunt_drives(hunt_id,sequence,title) values('00000000-0000-0000-0000-000000000010',1,'Aju 1') returning id");
 const position=await db.query("insert into hunt_positions(drive_id,number,location,assigned_participant_id) values($1,1,'{\"type\":\"Point\",\"coordinates\":[25,58]}',$2) returning assigned_participant_id",[drive.rows[0].id,participant.rows[0].id]);
 assert.equal(position.rows[0].assigned_participant_id,participant.rows[0].id);
 await db.exec('reset role');
 }finally{await db.close();}
});
