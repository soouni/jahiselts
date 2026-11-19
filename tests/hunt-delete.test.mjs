import test from 'node:test';
import assert from 'node:assert/strict';
import {createHuntDb} from './helpers/hunt-db.mjs';

const owner='00000000-0000-0000-0000-000000000001',admin='00000000-0000-0000-0000-000000000002',member='00000000-0000-0000-0000-000000000003';
const hunt='00000000-0000-0000-0000-000000000010',drive='00000000-0000-0000-0000-000000000020',person='00000000-0000-0000-0000-000000000030',position='00000000-0000-0000-0000-000000000040';
async function seed(db,status='planned'){
 await db.exec(`insert into auth.users values('${owner}'),('${admin}'),('${member}');
 insert into memberships values('o@test.invalid','${owner}','Omanik','owner',true),('a@test.invalid','${admin}','Admin','admin',true),('m@test.invalid','${member}','Liige','member',true);
 insert into hunts(id,title,leader_id,status) values('${hunt}','Testjaht','${admin}','${status}');
 insert into hunt_drives(id,hunt_id,sequence,title) values('${drive}','${hunt}',1,'Aju 1');
 insert into hunt_participants(id,hunt_id,display_name,role) values('${person}','${hunt}','A','hunter');
 insert into hunt_positions(id,drive_id,number,location,assigned_participant_id) values('${position}','${drive}',1,'{"type":"Point","coordinates":[24.9,58.6]}','${person}');
 insert into hunt_access_codes(hunt_id,code,created_by,expires_at) values('${hunt}','4821','${admin}',now()+interval '1 day');`);
}
const counts=async db=>(await db.query(`select (select count(*) from hunts)::int h,(select count(*) from hunt_drives)::int d,(select count(*) from hunt_participants)::int p,(select count(*) from hunt_positions)::int pos,(select count(*) from hunt_access_codes)::int c`)).rows[0];

test('delete_hunt: owner removes a planned hunt together with everything that belongs to it, and the deletion is audited',async()=>{
 const {db,as}=await createHuntDb();try{
 await seed(db);
 const result=(await as(owner,'select public.delete_hunt($1) as r',[hunt])).rows[0].r;
 assert.deepEqual(result,{title:'Testjaht',drives:1,participants:1});
 assert.deepEqual(await counts(db),{h:0,d:0,p:0,pos:0,c:0});
 const audit=(await db.query(`select kind,action,actor_name,before_data->>'title' as title from audit_events`)).rows;
 assert.deepEqual(audit,[{kind:'hunt',action:'Jaht kustutatud',actor_name:'Omanik',title:'Testjaht'}]);
 }finally{await db.close();}
});

test('delete_hunt: finished and paused hunts can be deleted; an active hunt cannot',async()=>{
 const {db,as}=await createHuntDb();try{
 await seed(db,'active');
 await assert.rejects(as(owner,'select public.delete_hunt($1)',[hunt]),/Aktiivset jahti ei saa kustutada/);
 assert.equal((await counts(db)).h,1,'active hunt is untouched');
 await db.exec(`update hunts set status='finished' where id='${hunt}'`);
 await as(owner,'select public.delete_hunt($1)',[hunt]);
 assert.equal((await counts(db)).h,0);
 }finally{await db.close();}
});

test('delete_hunt: admins, members and anonymous callers are refused and nothing is removed',async()=>{
 const {db,as}=await createHuntDb();try{
 await seed(db);
 for(const user of [admin,member])await assert.rejects(as(user,'select public.delete_hunt($1)',[hunt]),/ainult omanik/);
 await assert.rejects(as('','select public.delete_hunt($1)',[hunt]),/ainult omanik|permission denied/);
 assert.deepEqual(await counts(db),{h:1,d:1,p:1,pos:1,c:1});
 }finally{await db.close();}
});

test('delete_hunt: the table-level DELETE stays revoked and an unknown hunt is reported',async()=>{
 const {db,as}=await createHuntDb();try{
 await seed(db);
 await assert.rejects(as(owner,'delete from hunts where id=$1',[hunt]),/permission denied/);
 await assert.rejects(as(owner,'select public.delete_hunt($1)',['00000000-0000-0000-0000-0000000000ff']),/Jahti ei leitud/);
 assert.equal((await counts(db)).h,1);
 }finally{await db.close();}
});
