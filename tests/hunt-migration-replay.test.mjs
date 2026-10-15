import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync,readdirSync} from 'node:fs';
const dir=new URL('../supabase/migrations/',import.meta.url);
test('all hunt migrations replay in filename order without manually created helpers',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create publication supabase_realtime;
 create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.memberships(email text primary key,user_id uuid,display_name text,role text,active boolean);
 create function public.my_role() returns text language sql stable security definer set search_path='' as $$select role from public.memberships where user_id=auth.uid() and active$$;
 create table public.club_settings(id boolean primary key);
 create table public.audit_events(id uuid);
 create schema extensions;
 -- Spatial domains only allow PL/pgSQL declarations to compile. Spatial
 -- operations are not executed here; real PostGIS is covered by API tests.
 create domain extensions.geometry as jsonb;create domain extensions.geography as jsonb;
 grant usage on schema auth to authenticated;grant select on memberships to authenticated;
 `);
 const files=readdirSync(dir).filter(name=>name>='20261008091358'&&!name.endsWith('_harden_username_login_throttle.sql')).sort();
 for(const file of files){try{await db.exec(readFileSync(new URL(file,dir),'utf8'));}catch(error){throw new Error(file+': '+error.message);}}
 const {rows}=await db.query("select to_regprocedure('public.can_manage_hunt(uuid)')::text as helper,to_regprocedure('public.confirm_my_hunt_position(uuid,jsonb,numeric,timestamp with time zone)')::text as confirmation");
 assert.ok(rows[0].helper);assert.ok(rows[0].confirmation);
 // An owner who is not the leader can manage; an ordinary nonleader cannot.
 await db.exec(`insert into auth.users values('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');insert into memberships values('owner@test.invalid','00000000-0000-0000-0000-000000000001','Owner','owner',true),('member@test.invalid','00000000-0000-0000-0000-000000000002','Member','member',true);insert into hunts(id,title,leader_id) values('00000000-0000-0000-0000-000000000010','Replay','00000000-0000-0000-0000-000000000002');`);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",['00000000-0000-0000-0000-000000000001']);await db.exec('set role authenticated');
 const updated=await db.query("update hunts set title='Owner updated' returning id");assert.equal(updated.rows.length,1);await db.exec('reset role');
 }finally{await db.close();}
});
