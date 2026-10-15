import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

// Execute the production fixes in a disposable local PostgreSQL engine.
// The fixture models only the roles/tables needed by these migrations;
// the separate Supabase API suite verifies the complete deployed RLS stack.
const migrations=new URL('../supabase/migrations/',import.meta.url);
const migration=suffix=>readFileSync(new URL(readdirSync(migrations).find(name=>name.endsWith(suffix)),migrations),'utf8');
const ids={admin:'00000000-0000-0000-0000-000000000001',member:'00000000-0000-0000-0000-000000000002',viewer:'00000000-0000-0000-0000-000000000003',outsider:'00000000-0000-0000-0000-000000000004',inactive:'00000000-0000-0000-0000-000000000005',hunt:'00000000-0000-0000-0000-000000000010'};

async function fixture(){
 const db=new PGlite();
 await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  grant usage on schema public,auth to anon,authenticated,service_role;
  create table public.memberships(user_id uuid primary key,role text,active boolean);
  create function public.my_role() returns text language sql stable security definer set search_path='' as $$select role from public.memberships where user_id=auth.uid() and active$$;
  create table public.hunts(id uuid primary key,leader_id uuid,status text);
  create table public.hunt_drives(id uuid); create table public.hunt_participants(id uuid);
  create table public.hunt_positions(id uuid); create table public.hunt_roster(id uuid);
  create table public.hunt_locations(id uuid);
  grant all on all tables in schema public to anon,authenticated;
  insert into public.memberships values
   ('${ids.admin}','admin',true),('${ids.member}','member',true),
   ('${ids.viewer}','viewer',true),('${ids.inactive}','member',false);
  insert into public.hunts values('${ids.hunt}','${ids.admin}','planned');
 `);
 await db.exec(migration('_restrict_hunt_leader_roles.sql'));
 await db.exec(migration('_harden_username_login_throttle.sql'));
 return db;
}

async function asRole(db,role,user,fn){
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user||'']);
 await db.exec(`set role ${role}`);
 try{return await fn();}finally{await db.exec('reset role');}
}

test('PostgreSQL rejects outsider, viewer and inactive leader escalation',async()=>{
 const db=await fixture();
 try{
  for(const user of [ids.outsider,ids.viewer,ids.inactive,ids.member]){
   await asRole(db,'authenticated',user,()=>assert.rejects(db.query('select public.assign_hunt_leader($1,$2)',[ids.hunt,ids.member]),/Jahijuhti saab määrata/));
  }
  await asRole(db,'authenticated',ids.admin,async()=>{
   for(const target of [ids.viewer,ids.inactive,ids.outsider]){
    await assert.rejects(db.query('select public.assign_hunt_leader($1,$2)',[ids.hunt,target]),/Jahijuht peab olema aktiivne/);
   }
   await db.query('select public.assign_hunt_leader($1,$2)',[ids.hunt,ids.member]);
  });
  const manage=()=>db.query('select public.can_manage_hunt($1) as allowed',[ids.hunt]);
  assert.equal((await asRole(db,'authenticated',ids.member,manage)).rows[0].allowed,true);
  await db.query("update public.memberships set role='viewer' where user_id=$1",[ids.member]);
  assert.equal((await asRole(db,'authenticated',ids.member,manage)).rows[0].allowed,false,'demoting a leader immediately removes management access');
  await db.query('update public.hunts set leader_id=$1 where id=$2',[ids.viewer,ids.hunt]);
  assert.equal((await asRole(db,'authenticated',ids.viewer,manage)).rows[0].allowed,false,'an existing viewer leader also loses management access');
 }finally{await db.close();}
});

test('PostgreSQL denies anonymous tables and RLS-bypassing TRUNCATE privileges',async()=>{
 const db=await fixture();
 try{
  await asRole(db,'anon',null,()=>assert.rejects(db.query('select * from public.hunts'),/permission denied/));
  await asRole(db,'anon',null,()=>assert.rejects(db.query('select public.can_manage_hunt($1)',[ids.hunt]),/permission denied/));
  await asRole(db,'authenticated',ids.admin,()=>assert.rejects(db.exec('truncate public.hunts'),/permission denied/));
  for(const table of ['hunts','hunt_drives','hunt_participants','hunt_positions','hunt_roster','hunt_locations']){
   const {rows}=await db.query("select has_table_privilege('anon',$1,'SELECT') as anon_read,has_table_privilege('authenticated',$1,'TRUNCATE') as truncate,has_table_privilege('authenticated',$1,'SELECT') as member_read",[`public.${table}`]);
   assert.deepEqual(rows[0],{anon_read:false,truncate:false,member_read:true});
  }
 }finally{await db.close();}
});

test('login throttle limits a username across changing IPs and stays service-only',async()=>{
 const db=await fixture(),name='a'.repeat(64);
 try{
  for(const role of ['anon','authenticated']){
   await asRole(db,role,ids.viewer,()=>assert.rejects(db.query('select public.consume_username_login_attempt($1,$2)',['b'.repeat(64),name]),/permission denied/));
  }
  await asRole(db,'service_role',null,async()=>{
   for(let i=1;i<=10;i++){
    const {rows}=await db.query('select public.consume_username_login_attempt($1,$2) as allowed',[i.toString(16).padStart(64,'0'),name]);
    assert.equal(rows[0].allowed,true);
   }
   const attempt=await db.query('select public.consume_username_login_attempt($1,$2) as allowed',['c'.repeat(64),name]);
   assert.equal(attempt.rows[0].allowed,false,'rotating IP does not reset the account limit');
   await db.query('select public.clear_username_login_attempts($1,$2)',['c'.repeat(64),name]);
   const retry=await db.query('select public.consume_username_login_attempt($1,$2) as allowed',['c'.repeat(64),name]);
   assert.equal(retry.rows[0].allowed,true);
   const {rows}=await db.query("select attempts from public.username_login_limits where bucket='global'");
   assert.equal(rows[0].attempts,12,'successful login cleanup preserves the global budget');
  });
 }finally{await db.close();}
});
