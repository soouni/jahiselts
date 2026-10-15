import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const core=readFileSync(new URL('../supabase/migrations/20261015095434_hunt_live_operations_core.sql',import.meta.url),'utf8').toLowerCase();
const location=readFileSync(new URL('../supabase/migrations/20261015095440_hunt_live_location.sql',import.meta.url),'utf8').toLowerCase();
const planning=readFileSync(new URL('../supabase/migrations/20261008091358_initial_hunt_planning.sql',import.meta.url),'utf8').toLowerCase();
const cleanup=readFileSync(new URL('../supabase/migrations/20261015111154_remove_duplicate_active_drive_index.sql',import.meta.url),'utf8').toLowerCase();
const sql=core+'\n'+location;

test('hunt operations serialize active sessions and drive transitions',()=>{
 assert.match(sql,/create unique index if not exists hunts_one_active[\s\S]*?where status='active'/);
 assert.match(sql,/create unique index if not exists hunt_drives_one_active_per_hunt[\s\S]*?where status='active'/);
 assert.match(planning,/create unique index one_active_drive_per_hunt[\s\S]*?where status='active'/);
 assert.match(cleanup,/drop index if exists public\.hunt_drives_one_active_per_hunt/);
 assert.match(sql,/function public\.activate_hunt_drive[\s\S]*?update public\.hunt_drives[\s\S]*?set status='finished'[\s\S]*?set status='active'/);
 assert.match(sql,/current_hunt\.status='finished'[\s\S]*?cannot be reopened/);
});

test('GPS sharing and arrival checks stay authenticated and participant scoped',()=>{
 assert.match(sql,/alter table public\.hunt_locations enable row level security/);
 assert.match(sql,/create policy hunt_locations_insert[\s\S]*?participant\.user_id=\(select auth\.uid\(\)\)/);
 assert.match(sql,/create policy hunt_locations_update[\s\S]*?with check[\s\S]*?participant\.user_id=\(select auth\.uid\(\)\)/);
 assert.match(sql,/create or replace function public\.confirm_my_hunt_position[\s\S]*?participant\.user_id=\(select auth\.uid\(\)\)/);
 assert.match(sql,/revoke all on function public\.share_my_hunt_location[\s\S]*?from public,anon/);
 for(const name of ['set_hunt_status','activate_hunt_drive','finish_hunt_drive'])assert.match(core,new RegExp('function public\\.'+name+'[\\s\\S]*?security invoker'));
 assert.doesNotMatch(location,/security definer/);
});

test('live locations have coordinate bounds and are deleted at lifecycle boundaries',()=>{
 assert.match(sql,/hunt_locations_point check/);
 assert.match(sql,/delete from public\.hunt_locations where hunt_id=target_hunt_id/);
 assert.match(sql,/delete from public\.hunt_locations where hunt_id=target\.hunt_id/);
 assert.match(sql,/measured_at<now\(\)-interval '5 minutes'/);
});
