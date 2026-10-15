import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const migration=readFileSync(new URL('../supabase/migrations/20261010110000_hunt_owner_security.sql',import.meta.url),'utf8')
 .replace(/--.*$/gm,' ').replace(/\s+/g,' ').toLowerCase();
const leaderMigration=readFileSync(new URL('../supabase/migrations/20261015121220_restrict_hunt_leader_roles.sql',import.meta.url),'utf8')
 .replace(/--.*$/gm,' ').replace(/\s+/g,' ').toLowerCase();

test('membership administration cannot mint or modify an owner',()=>{
 assert.match(migration,/member_role is null or member_role not in \('admin','member','viewer'\)/);
 assert.match(migration,/if old\.role='owner' then raise exception/);
 assert.match(migration,/actor_role='admin' and \(member_role='admin' or old\.role='admin'\)/);
});

test('roster account links require an active owner and active target member',()=>{
 assert.match(migration,/m\.role='owner' and m\.active=true/);
 assert.match(migration,/target_user_id is not null/);
 assert.match(migration,/m\.user_id=target_user_id and m\.active=true/);
 assert.match(migration,/update public\.hunt_participants set user_id=target_user_id where roster_id=target_roster_id/);
});

test('anonymous execution is revoked and direct roster writes are guarded',()=>{
 for(const signature of ['owner_link_roster_account\\(uuid,uuid\\)','set_hunt_drive_area\\(uuid,jsonb\\)','admin_member\\(text,text,text,boolean\\)']){
  assert.match(migration,new RegExp(`revoke (?:all|execute) on function public\\.${signature} from public, ?anon`));
 }
 assert.match(migration,/before insert or update of user_id on public\.hunt_roster/);
 assert.match(migration,/revoke all on function public\.protect_hunt_roster_user_link\(\) from public,anon,authenticated/);
});

test('viewers cannot be promoted into hunt leaders',()=>{
 assert.match(leaderMigration,/m\.role = 'member' and h\.leader_id = \(select auth\.uid\(\)\)/);
 assert.match(leaderMigration,/revoke all on function public\.can_manage_hunt\(uuid\) from public, anon/);
 assert.match(leaderMigration,/grant execute on function public\.can_manage_hunt\(uuid\) to authenticated/);
 assert.match(leaderMigration,/actor_role not in \('owner', 'admin'\)/);
 assert.match(leaderMigration,/m\.active = true and m\.role in \('owner', 'admin', 'member'\)/);
 assert.match(leaderMigration,/for key share/);
 assert.match(leaderMigration,/revoke all on function public\.assign_hunt_leader\(uuid, uuid\) from public, anon/);
 assert.match(leaderMigration,/grant execute on function public\.assign_hunt_leader\(uuid, uuid\) to authenticated/);
 assert.match(leaderMigration,/security definer[\s\S]*?set search_path = ''/);
 assert.match(leaderMigration,/revoke all on table[\s\S]*?public\.hunt_locations from anon/);
 assert.match(leaderMigration,/revoke truncate, references, trigger on table[\s\S]*?public\.hunt_locations from authenticated/);
 assert.match(leaderMigration,/revoke delete on table public\.hunts, public\.hunt_drives from authenticated/);
});
