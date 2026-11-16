import {PGlite} from '@electric-sql/pglite';
import {readFileSync,readdirSync} from 'node:fs';
const dir=new URL('../../supabase/migrations/',import.meta.url);
/**
 * Proovandmebaas kõigi jahimigratsioonidega. PGlite'is puuduvad Supabase'i
 * laiendused, seetõttu asendatakse need siin minimaalsete tüügastega:
 * ruumitüübid on jsonb-domeenid ja pg_cron on ainult cron.schedule() kirje,
 * mille kutsed salvestatakse tabelisse cron.job, et teste saaks neid kontrollida.
 */
export async function createHuntDb(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;create publication supabase_realtime;
 create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.memberships(email text primary key,user_id uuid,display_name text,role text,active boolean);
 create function public.my_role() returns text language sql stable security definer set search_path='' as $$select role from public.memberships where user_id=auth.uid() and active$$;
 create table public.club_settings(id boolean primary key);
 create table public.audit_events(id uuid);
 create schema extensions;
 create domain extensions.geometry as jsonb;create domain extensions.geography as jsonb;
 create schema cron;create table cron.job(jobname text primary key,schedule text not null,command text not null);
 create function cron.schedule(job_name text,job_schedule text,job_command text) returns bigint language sql as $$insert into cron.job values(job_name,job_schedule,job_command) on conflict(jobname) do update set schedule=excluded.schedule,command=excluded.command returning 1::bigint$$;
 grant usage on schema auth to authenticated;grant select on memberships to authenticated;
 `);
 const files=readdirSync(dir).filter(name=>name>='20261008091358'&&!name.endsWith('_harden_username_login_throttle.sql')).sort();
 for(const file of files){
  // Laiendust ennast ei saa PGlite'is luua; kõik muu migratsioonist käivitatakse muutmata.
  const sql=readFileSync(new URL(file,dir),'utf8').replace(/^\s*create extension if not exists pg_cron[^;]*;/im,'');
  try{await db.exec(sql);}catch(error){await db.close();throw new Error(file+': '+error.message);}
 }
 /** Käivitab päringu sisselogitud kasutajana, nii et RLS ja õigused kehtivad nagu tootmises. */
 const as=async(user,sql,params)=>{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec('set role authenticated');try{return await db.query(sql,params);}finally{await db.exec('reset role');}};
 return {db,as,files};
}
