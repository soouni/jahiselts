import test from 'node:test';
import assert from 'node:assert/strict';
import {createHuntDb} from './helpers/hunt-db.mjs';

const leader='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002';
const hunt='00000000-0000-0000-0000-000000000010',drive='00000000-0000-0000-0000-000000000020';
const position=n=>'00000000-0000-0000-0000-0000000001'+String(n).padStart(2,'0');
const person=n=>'00000000-0000-0000-0000-0000000000'+String(30+n);
/** Kolm kütti, üks ajaja ja üks vaba koht: K1 A, K2 ajaja, K3 B, K4 vaba, K5 C. */
async function seed(db){
 await db.exec(`insert into auth.users values('${leader}'),('${other}');
 insert into memberships values('leader@test.invalid','${leader}','Juht','member',true),('other@test.invalid','${other}','Teine','member',true);
 insert into hunts(id,title,leader_id,status) values('${hunt}','Proovijaht','${leader}','planned');
 insert into hunt_drives(id,hunt_id,sequence,title) values('${drive}','${hunt}',1,'Aju 1');
 insert into hunt_participants(id,hunt_id,display_name,role) values('${person(1)}','${hunt}','A','hunter'),('${person(2)}','${hunt}','B','hunter'),('${person(3)}','${hunt}','C','hunter'),('${person(4)}','${hunt}','Ajaja Mees','driver');
 insert into hunt_positions(id,drive_id,number,location,assigned_participant_id) values
 ('${position(1)}','${drive}',1,'{"type":"Point","coordinates":[24.90,58.6]}','${person(1)}'),
 ('${position(2)}','${drive}',2,'{"type":"Point","coordinates":[24.91,58.6]}','${person(4)}'),
 ('${position(3)}','${drive}',3,'{"type":"Point","coordinates":[24.92,58.6]}','${person(2)}'),
 ('${position(4)}','${drive}',4,'{"type":"Point","coordinates":[24.93,58.6]}',null),
 ('${position(5)}','${drive}',5,'{"type":"Point","coordinates":[24.94,58.6]}','${person(3)}');`);
}
const layout=async db=>(await db.query(`select p.number,coalesce(hp.display_name,'vaba') as name,p.location->'coordinates'->>0 as lon from hunt_positions p left join hunt_participants hp on hp.id=p.assigned_participant_id order by p.number`)).rows.map(r=>r.number+':'+r.name).join(' ');

test('confirm_hunt_position_order: only the hunt manager applies a complete hunter order',async()=>{
 const {db,as}=await createHuntDb();try{
 await seed(db);
 const confirm=(user,ids)=>as(user,'select public.confirm_hunt_position_order($1,$2::uuid[])',[drive,ids]);
 const before=await layout(db);
 await assert.rejects(confirm(other,[position(5),position(3),position(1)]),/Jahijuhi õigus puudub/);
 await assert.rejects(confirm(leader,[position(5),position(3)]),/paigutus on muutunud/,'a missing hunter is refused');
 await assert.rejects(confirm(leader,[position(5),position(5),position(1)]),/paigutus on muutunud/,'a duplicate is refused');
 await assert.rejects(confirm(leader,[position(5),position(3),position(1),position(2)]),/paigutus on muutunud/,'a driver cannot join the hunter line');
 await assert.rejects(confirm(leader,[position(5),position(3),position(1),position(4)]),/paigutus on muutunud/,'a free position cannot join the hunter line');
 assert.equal(await layout(db),before,'refused calls leave numbering untouched');

 await confirm(leader,[position(5),position(3),position(1)]);
 assert.equal(await layout(db),'1:C 2:B 3:A 4:Ajaja Mees 5:vaba','hunters first in the confirmed order, then the rest in their previous order');
 const moved=await db.query(`select count(*)::int as n from hunt_positions where (id='${position(1)}' and (location->'coordinates'->>0)::numeric<>24.90) or (id='${position(5)}' and (location->'coordinates'->>0)::numeric<>24.94)`);
 assert.equal(moved.rows[0].n,0,'renumbering never moves a position');

 await db.exec(`update hunts set status='finished' where id='${hunt}'`);
 await assert.rejects(confirm(leader,[position(1),position(3),position(5)]),/õigus puudub|Lõpetatud/,'a finished hunt cannot be reordered');
 }finally{await db.close();}
});

test('finish_expired_hunts: closes only hunts started on an earlier Estonian day',async()=>{
 const {db,as}=await createHuntDb();try{
 await seed(db);
 const job=(await db.query("select schedule,command from cron.job where jobname='finish-expired-hunts-estonia'")).rows[0];
 assert.equal(job.schedule,'*/5 * * * *');assert.match(job.command,/public\.finish_expired_hunts\(\)/);
 await assert.rejects(as(leader,'select public.finish_expired_hunts()'),/permission denied/,'members cannot trigger the nightly close');
 const run=async()=>(await db.query('select public.finish_expired_hunts() as n')).rows[0].n;
 const status=async()=>(await db.query(`select h.status,d.status as drive from hunts h join hunt_drives d on d.hunt_id=h.id where h.id='${hunt}'`)).rows[0];

 assert.equal(await run(),0,'a planned hunt that never started stays planned');assert.equal((await status()).status,'planned');
 await as(leader,"select public.set_hunt_status($1,'active')",[hunt]);
 assert.equal(await run(),0,'a hunt started today stays open');assert.equal((await status()).status,'active');

 await as(leader,'select public.create_hunt_access_code($1)',[hunt]);
 // Kell 23.30 Eesti aja järgi eile alustatud jaht peab lõppema, kuigi UTC järgi võib olla sama kuupäev.
 await db.exec(`update hunts set starts_at=((now() at time zone 'Europe/Tallinn')::date - time '00:30') at time zone 'Europe/Tallinn' where id='${hunt}'`);
 assert.equal(await run(),1);assert.deepEqual(await status(),{status:'finished',drive:'finished'});
 assert.equal(await run(),0,'a finished hunt is not processed again');
 const code=(await db.query('select id from hunt_access_codes where revoked_at is null')).rows[0];
 assert.equal((await db.query('select public.hunt_guest_snapshot($1) as s',[code.id])).rows[0].s,null,'the hunt code stops working once the hunt is closed');
 }finally{await db.close();}
});

test('meeting place and time: managers set it, guests see it, bad values are refused',async()=>{
 const {db,as}=await createHuntDb();try{
 await seed(db);
 const save=(user,values)=>as(user,'update public.hunts set meeting_at=$2,meeting_point=$3::jsonb,meeting_note=$4 where id=$1 returning id',[hunt,...values]);
 const point='{"type":"Point","coordinates":[24.88,58.64]}';
 assert.equal((await save(other,['2026-11-21T06:00:00Z',point,'Jahimaja'])).rows.length,0,'another member cannot change the meeting place');
 assert.equal((await save(leader,['2026-11-21T06:00:00Z',point,'Jahimaja parkla'])).rows.length,1);
 for(const bad of ['{"type":"Point","coordinates":[2.35,48.85]}','{"type":"Point","coordinates":["24.88",58.64]}','{"type":"Point","coordinates":[24.88]}','{"type":"LineString","coordinates":[[24.8,58.6],[24.9,58.6]]}','"tekst"'])
  await assert.rejects(save(leader,[null,bad,null]),/hunts_meeting_point_valid/,bad);
 await assert.rejects(save(leader,[null,null,'x'.repeat(201)]),/hunts_meeting_note_length/);

 const code=(await as(leader,'select public.create_hunt_access_code($1) as c',[hunt])).rows[0].c;
 const id=(await db.query('select id from hunt_access_codes where code=$1',[code.code])).rows[0].id;
 const snapshot=async()=>(await db.query('select public.hunt_guest_snapshot($1) as s',[id])).rows[0].s;
 const view=await snapshot();
 assert.deepEqual(view.meeting.coordinates,[24.88,58.64]);assert.equal(view.meeting.note,'Jahimaja parkla');
 assert.equal(new Date(view.meeting.at).toISOString(),'2026-11-21T06:00:00.000Z');
 assert.deepEqual(view.positions.map(p=>[p.number,p.role]),[[1,'hunter'],[2,'driver'],[3,'hunter'],[5,'hunter']],'drivers stay in the guest view so their entry point can be shown');
 assert.equal(view.positions[1].name,'Ajaja M.');

 await save(leader,[null,null,null]);
 assert.equal((await snapshot()).meeting,null,'no meeting details means no meeting block');
 await assert.rejects(as(leader,'select public.hunt_guest_snapshot($1)',[id]),/permission denied/,'the replaced function keeps service-role-only access');
 }finally{await db.close();}
});
