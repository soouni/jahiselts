import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';
import ts from 'typescript';
import {createHuntDb} from './helpers/hunt-db.mjs';
import {cleanSnapshot,readGuestSession,saveGuestSession,validCode,guestProblem} from '../src/guest/session.ts';

const source=readFileSync(new URL('../supabase/functions/hunt-code/index.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const codeId='11111111-2222-4333-8444-555555555555';
const view={hunt:{title:'Laupäevane jaht',status:'active'},drive:{sequence:1,title:'Aju 1',status:'active',area:null},positions:[{id:'p1',number:1,coordinates:[24.9,58.6],role:'hunter',name:'Mari M.'}],expires_at:new Date(Date.now()+3600e3).toISOString(),generated_at:new Date().toISOString()};
function setup({status='ok',snapshot=view,expires=view.expires_at}={}){
 let handler;const calls=[];
 const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_SECRET_KEYS:JSON.stringify({default:'sb_secret_fixture'})};
 runInNewContext(code,{Deno:{env:{get:k=>env[k]},serve:fn=>handler=fn},TextEncoder,Response,AbortSignal,Date,Number,Math,JSON,crypto:webcrypto,fetch:async(url,init)=>{
  calls.push({url,body:JSON.parse(init.body)});
  if(url.endsWith('/rpc/redeem_hunt_access_code'))return Response.json(status==='ok'?{status,code_id:codeId,expires_at:expires}:{status});
  if(url.endsWith('/rpc/hunt_guest_snapshot'))return Response.json(snapshot);
  throw Error('Unexpected endpoint');
 }});
 return {calls,run:(body,origin='https://soouni.github.io',extra={'x-forwarded-for':'203.0.113.7'})=>handler(new Request('https://test.supabase.co/functions/v1/hunt-code',{method:'POST',headers:{origin,'Content-Type':'application/json',...extra},body:JSON.stringify(body)}))};
}

test('valid code returns a signed view-only token and the hunt view',async()=>{
 const x=setup();const r=await x.run({action:'redeem',code:'4827'});
 assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'no-store');
 const data=await r.json();assert.match(data.token,/^v1\.[0-9a-f-]{36}\.[0-9]{10}\.[a-f0-9]{64}$/);assert.equal(data.snapshot.hunt.title,'Laupäevane jaht');
 assert.match(x.calls[0].body.ip_hash,/^[a-f0-9]{64}$/);assert.ok(!JSON.stringify(x.calls[0].body).includes('203.0.113.7'));
 const again=await x.run({action:'view',token:data.token});assert.equal(again.status,200);assert.deepEqual((await again.json()).snapshot.positions[0].name,'Mari M.');
});
test('wrong code, throttling and malformed input never reach the hunt view',async()=>{
 const wrong=setup({status:'invalid'});const r=await wrong.run({action:'redeem',code:'0001'});assert.equal(r.status,400);assert.deepEqual(await r.json(),{code:'invalid_code'});assert.equal(wrong.calls.length,1);
 const slow=setup({status:'throttled'});assert.equal((await slow.run({action:'redeem',code:'0001'})).status,429);assert.equal(slow.calls.length,1);
 for(const bad of ['123','12345','12a4','',null,1234]){const x=setup();assert.equal((await x.run({action:'redeem',code:bad})).status,400);assert.equal(x.calls.length,0);}
});
test('the global lock has its own answer and the throttle ignores spoofed addresses',async()=>{
 const locked=setup({status:'locked'});const r=await locked.run({action:'redeem',code:'4827'});assert.equal(r.status,429);assert.deepEqual(await r.json(),{code:'temporarily_locked'});assert.equal(locked.calls.length,1);
 const hashOf=async headers=>{const x=setup();await x.run({action:'redeem',code:'4827'},'https://soouni.github.io',headers);return x.calls[0].body.ip_hash;};
 const real=await hashOf({'x-forwarded-for':'203.0.113.7'});
 assert.equal(await hashOf({'x-forwarded-for':'1.1.1.1, 203.0.113.7'}),real,'a client-written first entry must not change the bucket');
 assert.equal(await hashOf({'x-forwarded-for':'9.9.9.9, 8.8.8.8, 203.0.113.7'}),real);
 assert.equal(await hashOf({'cf-connecting-ip':'203.0.113.7','x-forwarded-for':'5.5.5.5'}),real,'the gateway header wins');
 assert.notEqual(await hashOf({'x-forwarded-for':'203.0.113.8'}),real);
 const v6=await hashOf({'x-forwarded-for':'2001:db8:1:2:aaaa:bbbb:cccc:dddd'});
 assert.equal(await hashOf({'x-forwarded-for':'2001:db8:1:2::9'}),v6,'one IPv6 /64 is one device owner');
 assert.equal(await hashOf({'x-forwarded-for':'2001:0db8:0001:0002:0:0:0:1'}),v6);
 assert.notEqual(await hashOf({'x-forwarded-for':'2001:db8:1:3::9'}),v6);
 assert.equal(await hashOf({'x-forwarded-for':'::ffff:203.0.113.7'}),real,'an IPv4-mapped IPv6 address is the same client as its IPv4 form');
 assert.equal(await hashOf({'x-forwarded-for':'::ffff:cb00:7107'}),real,'the hex form of a mapped address too');
 assert.equal(await hashOf({'x-forwarded-for':'203.0.113.7:51234'}),real,'a port does not make a new client');
 assert.equal(await hashOf({'x-forwarded-for':'[2001:db8:1:2::9]:4433'}),v6,'a bracketed IPv6 address with a port is the same /64');
 assert.notEqual(await hashOf({'x-forwarded-for':'::ffff:203.0.113.8'}),real);
 assert.notEqual(await hashOf({'x-forwarded-for':'::ffff:203.0.113.8'}),await hashOf({'x-forwarded-for':'::ffff:203.0.113.9'}),'mapped addresses no longer share one bucket');
 assert.equal(await hashOf({}),await hashOf({'x-forwarded-for':'  '}),'no address at all shares one cautious bucket');
});
test('forged, altered and expired tokens are rejected before any database call',async()=>{
 const x=setup();const {token}=await (await x.run({action:'redeem',code:'4827'})).json();const [v,id,exp,sig]=token.split('.');
 const before=x.calls.length;
 for(const forged of [[v,id,String(Number(exp)+3600),sig].join('.'),[v,'99999999-2222-4333-8444-555555555555',exp,sig].join('.'),[v,id,exp,'0'.repeat(64)].join('.'),'v1.x.y.z','',null]){
  const r=await x.run({action:'view',token:forged});assert.equal(r.status,401);assert.deepEqual(await r.json(),{code:'guest_expired'});
 }
 assert.equal(x.calls.length,before);
 const old=setup({expires:new Date(Date.now()-60e3).toISOString()});const stale=await (await old.run({action:'redeem',code:'4827'})).json();
 assert.equal((await old.run({action:'view',token:stale.token})).status,401);
});
test('revoked code or finished hunt closes an already issued token',async()=>{
 const x=setup();const {token}=await (await x.run({action:'redeem',code:'4827'})).json();
 const gone=setup({snapshot:null});assert.equal((await gone.run({action:'view',token})).status,401);
});
test('foreign origin and unknown actions are refused',async()=>{
 const x=setup();assert.equal((await x.run({action:'redeem',code:'4827'},'https://untrusted.invalid')).status,403);assert.equal(x.calls.length,0);
 assert.equal((await x.run({action:'write'})).status,400);
});
test('the endpoint contains no write path and never logs',()=>{
 assert.doesNotMatch(source,/console\./);
 assert.deepEqual([...source.matchAll(/rpc\('([a-z_]+)'/g)].map(m=>m[1]).sort(),['hunt_guest_snapshot','redeem_hunt_access_code']);
 assert.doesNotMatch(source,/\/rest\/v1\/(?!rpc\/)/);
});

function storage(){const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
test('guest device storage drops expired sessions and malformed rows',()=>{
 assert.equal(validCode('0427'),true);assert.equal(validCode('427'),false);assert.equal(validCode('12 4'),false);
 const clean=cleanSnapshot({...view,positions:[...view.positions,{id:'bad',number:2,coordinates:[999,58],role:'hunter',name:'X'},null]});assert.equal(clean.positions.length,1);
 assert.equal(cleanSnapshot({hunt:{},positions:[]}),null);
 const store=storage();saveGuestSession(store,{token:'t',snapshot:clean,savedAt:1,myPositionId:'p1'});
 assert.equal(readGuestSession(store).myPositionId,'p1');
 assert.equal(readGuestSession(store,Date.parse(view.expires_at)+1),null);assert.equal(store.getItem('parnjoe-jahikood-v1'),null);
 assert.match(guestProblem('invalid_code'),/vale või aegunud/);
 assert.match(guestProblem('over_request_rate_limit'),/seadmest.*15 minutit/);
 assert.match(guestProblem('temporarily_locked'),/hetkeks suletud.*jahijuhilt/);
 assert.notEqual(guestProblem('temporarily_locked'),guestProblem('over_request_rate_limit'));
});

test('database: only hunt managers mint codes; guests get a throttled, name-shortened, read-only view',async()=>{
 const {db,as}=await createHuntDb();try{
 const leader='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002',hunt='00000000-0000-0000-0000-000000000010',ip='a'.repeat(64),ip2='b'.repeat(64);
 await db.exec(`insert into auth.users values('${leader}'),('${other}');
 insert into memberships values('leader@test.invalid','${leader}','Juht','member',true),('other@test.invalid','${other}','Teine','member',true);
 insert into hunts(id,title,leader_id,status) values('${hunt}','Proovijaht','${leader}','planned');
 insert into hunt_drives(id,hunt_id,sequence,title) values('00000000-0000-0000-0000-000000000020','${hunt}',1,'Aju 1');
 insert into hunt_participants(id,hunt_id,display_name,role) values('00000000-0000-0000-0000-000000000030','${hunt}','  Mari   Maasikas ','hunter'),('00000000-0000-0000-0000-000000000031','${hunt}','Jaan','driver');
 insert into hunt_positions(drive_id,number,location,assigned_participant_id) values('00000000-0000-0000-0000-000000000020',1,'{"type":"Point","coordinates":[24.9,58.6]}','00000000-0000-0000-0000-000000000030'),('00000000-0000-0000-0000-000000000020',2,'{"type":"Point","coordinates":[24.91,58.61]}','00000000-0000-0000-0000-000000000031'),('00000000-0000-0000-0000-000000000020',3,'{"type":"Point","coordinates":[24.92,58.62]}',null);`);

 await assert.rejects(as(other,'select public.create_hunt_access_code($1)',[hunt]),/ainult jahijuht/);
 await assert.rejects(as(other,'select public.get_hunt_access_code($1)',[hunt]),/ainult jahijuht/);
 await assert.rejects(as(leader,'select * from public.hunt_access_codes'),/permission denied/);
 await assert.rejects(as(leader,'select public.redeem_hunt_access_code($1,$2)',['1234',ip]),/permission denied/);
 await assert.rejects(as(leader,'select public.hunt_guest_snapshot($1)',[hunt]),/permission denied/);

 const first=(await as(leader,'select public.create_hunt_access_code($1) as c',[hunt])).rows[0].c;
 assert.match(first.code,/^[0-9]{4}$/);
 assert.equal((await as(leader,'select public.get_hunt_access_code($1) as c',[hunt])).rows[0].c.code,first.code);
 const second=(await as(leader,'select public.create_hunt_access_code($1) as c',[hunt])).rows[0].c;
 assert.equal((await db.query('select count(*)::int as n from hunt_access_codes where revoked_at is null')).rows[0].n,1);

 const redeem=async(value,address=ip)=>(await db.query('select public.redeem_hunt_access_code($1,$2) as r',[value,address])).rows[0].r;
 if(first.code!==second.code)assert.equal((await redeem(first.code,ip2)).status,'invalid');
 const ok=await redeem(second.code);assert.equal(ok.status,'ok');
 const snapshot=(await db.query('select public.hunt_guest_snapshot($1) as s',[ok.code_id])).rows[0].s;
 assert.equal(snapshot.hunt.title,'Proovijaht');assert.equal(snapshot.drive.title,'Aju 1');
 assert.deepEqual(snapshot.positions.map(p=>[p.number,p.name,p.role]),[[1,'Mari M.','hunter'],[2,'Jaan','driver']]);
 assert.deepEqual(snapshot.positions[0].coordinates,[24.9,58.6]);
 assert.doesNotMatch(JSON.stringify(snapshot),/Maasikas|user_id|email/);

 const wrong=second.code==='0000'?'0001':'0000';
 for(let i=0;i<5;i++)assert.equal((await redeem(wrong)).status,'invalid');
 assert.equal((await redeem(second.code)).status,'throttled','a blocked address cannot keep guessing, even with the right code');
 assert.equal((await redeem(second.code,ip2)).status,'ok','other addresses stay unaffected below the global limit');
 await db.exec("update hunt_code_limits set attempts=59,expires_at=now()+interval '1 hour' where bucket='global'");
 assert.equal((await redeem(second.code,'c'.repeat(64))).status,'ok','just below the global limit the right code still works');
 await db.exec("update hunt_code_limits set attempts=60,expires_at=now()+interval '1 hour' where bucket='global'");
 assert.equal((await redeem(second.code,'c'.repeat(64))).status,'locked','global limit caps distributed guessing and says so, instead of blaming the address');
 assert.equal((await redeem(wrong,'d'.repeat(64))).status,'locked','a locked system does not answer guesses either');
 await db.exec("update hunt_code_limits set expires_at=now()-interval '1 minute' where bucket='global'");
 assert.equal((await redeem(second.code,'e'.repeat(64))).status,'ok','the lock ends by itself after the hour');
 await db.exec('delete from hunt_code_limits');

 const counters=async()=>Object.fromEntries((await db.query('select bucket,attempts from hunt_code_limits')).rows.map(r=>[r.bucket,r.attempts]));
 const g='f'.repeat(64);
 assert.equal((await redeem(second.code,g)).status,'ok');
 assert.deepEqual(Object.values(await counters()).reduce((a,b)=>a+b,0),0,'a right code costs no attempt');
 assert.equal((await redeem(wrong,g)).status,'invalid');
 assert.equal((await counters())['ip:'+g],1,'a wrong code is counted before any other work');assert.equal((await counters()).global,1);
 for(let i=0;i<4;i++)await redeem(wrong,g);
 assert.equal((await redeem(wrong,g)).status,'throttled');
 assert.equal((await counters()).global,5,'a throttled address does not use up the global budget');
 await db.exec("update hunt_code_limits set attempts=60,expires_at=now()+interval '1 hour' where bucket='global'");
 const h='9'.repeat(64);
 assert.equal((await redeem(wrong,h)).status,'locked');
 assert.equal((await counters())['ip:'+h],0,'a locked system is not blamed on the address');
 await db.exec('delete from hunt_code_limits');

 await as(leader,'select public.revoke_hunt_access_code($1)',[hunt]);
 assert.equal((await redeem(second.code,ip2)).status,'invalid');
 assert.equal((await db.query('select public.hunt_guest_snapshot($1) as s',[ok.code_id])).rows[0].s,null);
 }finally{await db.close();}
});
