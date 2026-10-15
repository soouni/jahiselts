import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';

const projectRef='pipwbfmgmuiisrvnnnmw';
const required=['RLS_TEST_URL','RLS_TEST_PUBLISHABLE_KEY','RLS_TEST_SECRET_KEY','RLS_TEST_ADMIN_EMAIL','RLS_TEST_ADMIN_PASSWORD','RLS_TEST_MEMBER_EMAIL','RLS_TEST_MEMBER_PASSWORD','RLS_TEST_VIEWER_EMAIL','RLS_TEST_VIEWER_PASSWORD'];
const missing=required.filter(key=>!process.env[key]);
if(missing.length)throw Error(`Puuduvad testkeskkonna muutujad: ${missing.join(', ')}`);
if(process.env.RLS_TEST_ACK!=='I_UNDERSTAND_THIS_IS_A_DISPOSABLE_PROJECT')throw Error('Testid kirjutavad andmebaasi. Kinnita, et kasutad eraldi ajutist Supabase testprojekti.');
const url=new URL(process.env.RLS_TEST_URL);
if(url.origin!==`https://${projectRef}.supabase.co`)throw Error(`Peatasin töö: testid võivad muuta ainult ajutist projekti ${projectRef}.`);

const createAccount=()=>createClient(url.href,process.env.RLS_TEST_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const anonymous=createAccount();
async function login(role){
 const account=createAccount();
 const {data,error}=await account.auth.signInWithPassword({email:process.env[`RLS_TEST_${role}_EMAIL`],password:process.env[`RLS_TEST_${role}_PASSWORD`]});
 if(error)throw error;
 return {client:account,user:data.user};
}
const adminClient=createClient(url.href,process.env.RLS_TEST_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const admin=await login('ADMIN');
const member=await login('MEMBER');
const viewer=await login('VIEWER');
const checks=[];
function assert(value,label){if(!value)throw Error(`FAIL: ${label}`);checks.push(`PASS: ${label}`);}
async function expectDenied(promise,label){const {data,error}=await promise;assert(Boolean(error)&&!data,label);}
const suffix=randomUUID();
let huntId=null;
let secondHuntId=null;
let outsiderId=null;

try{
 for(const table of ['hunts','hunt_drives','hunt_participants','hunt_positions','hunt_roster','hunt_locations']){
  await expectDenied(anonymous.from(table).select('*').limit(1),`anon ei pääse tabelisse ${table}`);
 }
 const outsiderEmail=`security-outsider-${suffix}@example.invalid`,outsiderPassword=randomUUID()+randomUUID();
 const {data:outsiderData,error:outsiderError}=await adminClient.auth.admin.createUser({email:outsiderEmail,password:outsiderPassword,email_confirm:true});
 if(outsiderError)throw outsiderError;
 outsiderId=outsiderData.user.id;
 const outsider=createAccount();
 const {error:outsiderLoginError}=await outsider.auth.signInWithPassword({email:outsiderEmail,password:outsiderPassword});
 if(outsiderLoginError)throw outsiderLoginError;
 const {data:hunt,error:huntError}=await admin.client.from('hunts').insert({title:`API test ${suffix}`,type:'drive',leader_id:admin.user.id,allow_self_selection:true}).select('id').single();
 if(huntError)throw huntError;
 huntId=hunt.id;
 await expectDenied(outsider.rpc('assign_hunt_leader',{target_hunt_id:huntId,new_leader_id:member.user.id}),'liikmesuseta sisselogitud konto ei saa jahijuhti määrata');
 const {data:drive,error:driveError}=await admin.client.from('hunt_drives').insert({hunt_id:huntId,sequence:1,title:'API test drive'}).select('id').single();
 if(driveError)throw driveError;
 await expectDenied(member.client.rpc('set_hunt_status',{target_hunt_id:huntId,new_status:'active'}),'tavaline liige ei halda jahti enne jahijuhiks määramist');
 await expectDenied(member.client.from('hunt_participants').insert({hunt_id:huntId,user_id:member.user.id,display_name:'Keelatud testosaleja',role:'hunter'}),'tavaline liige ei lisa teise juhi jahi osalejaid');
 await expectDenied(admin.client.rpc('assign_hunt_leader',{target_hunt_id:huntId,new_leader_id:viewer.user.id}),'admin ei saa vaatajat jahijuhiks määrata');
 const {data:viewerCanManage,error:viewerManageError}=await viewer.client.rpc('can_manage_hunt',{target_hunt_id:huntId});
 assert(!viewerManageError&&viewerCanManage===false,'vaataja ei saa haldusõigusi enne juhiks määramist');
 await expectDenied(viewer.client.rpc('assign_hunt_leader',{target_hunt_id:huntId,new_leader_id:viewer.user.id}),'vaataja ei saa ise end jahijuhiks määrata');
 const {error:leaderError}=await admin.client.rpc('assign_hunt_leader',{target_hunt_id:huntId,new_leader_id:member.user.id});
 if(leaderError)throw leaderError;
 assert(true,'admin määrab aktiivse liikme jahijuhiks');
 const {data:memberCanManage,error:memberManageError}=await member.client.rpc('can_manage_hunt',{target_hunt_id:huntId});
 assert(!memberManageError&&memberCanManage===true,'aktiivne juhiks määratud liige saab jahti hallata');
 const {error:restoreLeaderError}=await admin.client.rpc('assign_hunt_leader',{target_hunt_id:huntId,new_leader_id:admin.user.id});if(restoreLeaderError)throw restoreLeaderError;
 const {data:viewerStillCannotManage,error:viewerAfterAssignError}=await viewer.client.rpc('can_manage_hunt',{target_hunt_id:huntId});
 assert(!viewerAfterAssignError&&viewerStillCannotManage===false,'vaataja ei saa haldusõigusi ka pärast juhiks määramise katset');

 await expectDenied(viewer.client.from('hunt_participants').insert({hunt_id:huntId,display_name:'Keelatud testosaleja',role:'hunter'}),'vaataja ei lisa jahi osalejat');
 await expectDenied(viewer.client.rpc('set_hunt_status',{target_hunt_id:huntId,new_status:'active'}),'vaataja ei muuda jahi olekut');
 await expectDenied(member.client.rpc('set_hunt_status',{target_hunt_id:randomUUID(),new_status:'active'}),'jahijuht ei muuda olematut jahti');

 const {data:participant,error:participantError}=await admin.client.from('hunt_participants').insert({hunt_id:huntId,user_id:member.user.id,display_name:'Test tavaliige',role:'hunter',status:'present'}).select('id').single();
 if(participantError)throw participantError;
 const {data:position,error:positionError}=await admin.client.from('hunt_positions').insert({drive_id:drive.id,number:1,location:{type:'Point',coordinates:[24.887,58.638]}}).select('id').single();
 if(positionError)throw positionError;

 const {data:activeDrive,error:activateError}=await admin.client.rpc('activate_hunt_drive',{target_drive_id:drive.id});
 if(activateError)throw activateError;
 assert(activeDrive.status==='active','määratud jahijuht alustab aju ja jahi');
 const {data:activeHunt,error:activeHuntError}=await member.client.from('hunts').select('status').eq('id',huntId).single();
 if(activeHuntError)throw activeHuntError;
 assert(activeHunt.status==='active','aju alustamine viib jahi aktiivsesse olekusse');

 const {data:secondHunt,error:secondError}=await admin.client.from('hunts').insert({title:`API test concurrent ${suffix}`,type:'drive',leader_id:admin.user.id}).select('id').single();
 if(secondError)throw secondError;
 secondHuntId=secondHunt.id;
 const {data:secondDrive,error:secondDriveError}=await admin.client.from('hunt_drives').insert({hunt_id:secondHuntId,sequence:1,title:'Teine testiaju'}).select('id').single();
 if(secondDriveError)throw secondDriveError;
 await expectDenied(admin.client.rpc('activate_hunt_drive',{target_drive_id:secondDrive.id}),'teist jahti ei saa esimese aktiivsuse ajal käivitada');

 const {data:claimed,error:claimError}=await member.client.rpc('claim_hunt_position',{target_position_id:position.id});
 if(claimError)throw claimError;
 assert(claimed.assigned_participant_id===participant.id,'tavaline osaleja võtab vaba positsiooni ise');
 const {data:confirmed,error:confirmError}=await member.client.rpc('confirm_my_hunt_position',{target_position_id:position.id,current_location:{type:'Point',coordinates:[24.887,58.638]},current_accuracy_m:8,measured_at:new Date().toISOString()});
 if(confirmError)throw confirmError;
 assert(Boolean(confirmed.confirmed_at)&&Number(confirmed.confirmation_distance_m)===0,'osaleja kinnitab enda määratud positsiooni GPS-iga');
 await expectDenied(viewer.client.rpc('confirm_my_hunt_position',{target_position_id:position.id,current_location:{type:'Point',coordinates:[24.887,58.638]},current_accuracy_m:8,measured_at:new Date().toISOString()}),'vaataja ei kinnita teise osaleja positsiooni');

 const measuredAt=new Date().toISOString();
 const {data:location,error:locationError}=await member.client.rpc('share_my_hunt_location',{target_hunt_id:huntId,current_location:{type:'Point',coordinates:[24.887,58.638]},current_accuracy_m:12,current_heading_deg:90,measured_at:measuredAt});
 if(locationError)throw locationError;
 assert(location.user_id===member.user.id,'osaleja jagab ainult enda asukohta');
 const {data:memberLocations,error:memberLocationError}=await member.client.from('hunt_locations').select('participant_id').eq('hunt_id',huntId);
 if(memberLocationError)throw memberLocationError;
 assert(memberLocations.length===1,'osaleja näeb enda aktiivset asukohta');
 const {data:adminLocations,error:adminLocationError}=await admin.client.from('hunt_locations').select('participant_id').eq('hunt_id',huntId);
 if(adminLocationError)throw adminLocationError;
 assert(adminLocations.length===1,'admin näeb hallatava jahi asukohta');
 const {data:viewerLocations,error:viewerLocationError}=await viewer.client.from('hunt_locations').select('participant_id').eq('hunt_id',huntId);
 if(viewerLocationError)throw viewerLocationError;
 assert(viewerLocations.length===0,'mitteosalev vaataja ei näe GPS-asukohta');
 await expectDenied(viewer.client.rpc('share_my_hunt_location',{target_hunt_id:huntId,current_location:{type:'Point',coordinates:[24.887,58.638]},current_accuracy_m:5,current_heading_deg:null,measured_at:measuredAt}),'mitteosalev vaataja ei jaga asukohta jahis');
 await expectDenied(member.client.rpc('share_my_hunt_location',{target_hunt_id:huntId,current_location:{type:'Point',coordinates:[24.887,58.638]},current_accuracy_m:5,current_heading_deg:null,measured_at:new Date(Date.now()-10*60_000).toISOString()}),'aegunud GPS-asukoht lükatakse tagasi');

 const {error:finishDriveError}=await admin.client.rpc('finish_hunt_drive',{target_drive_id:drive.id});
 if(finishDriveError)throw finishDriveError;
 const {data:afterFinish,error:afterFinishError}=await admin.client.from('hunt_locations').select('participant_id').eq('hunt_id',huntId);
 if(afterFinishError)throw afterFinishError;
 assert(afterFinish.length===0,'aju lõpetamine kustutab reaalajas asukohad');
 const {data:finishedHunt,error:finishHuntError}=await admin.client.rpc('set_hunt_status',{target_hunt_id:huntId,new_status:'finished'});
 if(finishHuntError)throw finishHuntError;
 assert(finishedHunt.status==='finished','admin lõpetab jahi');
 await expectDenied(member.client.rpc('set_hunt_status',{target_hunt_id:huntId,new_status:'active'}),'lõpetatud jahti ei saa uuesti avada');

 console.log(checks.join('\n'));
}finally{
 // The service key is accepted only for the explicitly named disposable test project.
 if(secondHuntId){const {error}=await adminClient.from('hunts').delete().eq('id',secondHuntId);if(error)console.error('Teise testjahi kustutamine ebaõnnestus:',error.message);}
 if(huntId){const {error}=await adminClient.from('hunts').delete().eq('id',huntId);if(error)console.error('Testjahi kustutamine ebaõnnestus:',error.message);}
 if(outsiderId){const {error}=await adminClient.auth.admin.deleteUser(outsiderId);if(error)console.error('Testkonto kustutamine ebaõnnestus:',error.message);}
}
