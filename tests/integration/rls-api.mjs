import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';

const required=['RLS_TEST_URL','RLS_TEST_PUBLISHABLE_KEY','RLS_TEST_ADMIN_EMAIL','RLS_TEST_ADMIN_PASSWORD','RLS_TEST_MEMBER_EMAIL','RLS_TEST_MEMBER_PASSWORD','RLS_TEST_VIEWER_EMAIL','RLS_TEST_VIEWER_PASSWORD','RLS_TEST_INACTIVE_EMAIL','RLS_TEST_INACTIVE_PASSWORD'];
const missing=required.filter(k=>!process.env[k]);
if(missing.length)throw Error(`Puuduvad testkeskkonna muutujad: ${missing.join(', ')}`);
if(process.env.RLS_TEST_ACK!=='I_UNDERSTAND_THIS_IS_A_DISPOSABLE_PROJECT')throw Error('Testid kirjutavad andmebaasi. Kinnita, et kasutad eraldi ajutist Supabase testprojekti.');
const url=process.env.RLS_TEST_URL;
if(/asvbfhbmegmeuvvtgvor|prod|production/i.test(new URL(url).hostname))throw Error('Tootmiskeskkonnas käivitamine on keelatud.');
const client=()=>createClient(url,process.env.RLS_TEST_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
async function login(prefix){const c=client();const {data,error}=await c.auth.signInWithPassword({email:process.env[`RLS_TEST_${prefix}_EMAIL`],password:process.env[`RLS_TEST_${prefix}_PASSWORD`]});if(error)throw error;return c;}
async function rpc(c,name,args){const {data,error}=await c.rpc(name,args);if(error)throw error;return data;}
function point(){return {type:'Point',coordinates:[24.887,58.638]};}
function props(name){return {name,observer:'RLS test',outside:false};}
const id=()=>randomUUID();
const results=[];
function assert(ok,label){if(!ok)throw Error(`FAIL: ${label}`);results.push(`PASS: ${label}`);}
const [admin,member,viewer,inactive]=await Promise.all(['ADMIN','MEMBER','VIEWER','INACTIVE'].map(login));
for(const [c,role,active] of [[admin,'admin',true],[member,'member',true],[viewer,'viewer',true],[inactive,'member',false]]){
 const {data,error}=await c.rpc('join_club');
 if(error)throw error;
 assert(active?(data?.[0]?.role===role&&data[0].active===true):data.length===0,`${role} konto aktiivse liikmesuse kontroll`);
}
const {data:settings,error:settingsError}=await admin.from('club_settings').select('viewer_layers').single();
if(settingsError)throw settingsError;
const viewerCanSeeObservations=settings.viewer_layers.includes('observation');
const inactiveUser=(await inactive.auth.getUser()).data.user;
const {data:inactiveRows,error:inactiveError}=await inactive.from('memberships').select('user_id').eq('user_id',inactiveUser.id);
if(inactiveError)throw inactiveError;
assert(inactiveRows.length===0,'deaktiveeritud liige ei loe enda membership-rida');

const mapId=id();
await rpc(admin,'save_feature',{feature_kind:'place',feature_id:mapId,expected_version:0,feature_properties:{...props(`RLS audit ${mapId}`),type:'Orientiir'},feature_geometry:point()});
const {data:memberMap,error:memberMapError}=await member.from('map_objects').select('id').eq('id',mapId);
if(memberMapError)throw memberMapError;
assert(memberMap.length===1,'liige loeb kohakihi objekti');
const {data:viewerMap,error:viewerMapError}=await viewer.from('map_objects').select('id').eq('id',mapId);
if(viewerMapError)throw viewerMapError;
assert(viewerMap.length===1,'vaataja loeb talle lubatud kohakihti');
const {data:inactiveMap,error:inactiveMapError}=await inactive.from('map_objects').select('id').eq('id',mapId);
if(inactiveMapError)throw inactiveMapError;
assert(inactiveMap.length===0,'deaktiveeritud liige ei loe kaardiobjekte');
const {data:memberWrite,error:memberWriteError}=await member.rpc('save_feature',{feature_kind:'place',feature_id:id(),expected_version:0,feature_properties:{...props('Keelatud'),type:'Orientiir'},feature_geometry:point()});
assert(Boolean(memberWriteError)&&!memberWrite,'liige ei lisa adminile mõeldud kohakirjet');
const obsId=id();
await rpc(member,'save_feature',{feature_kind:'observation',feature_id:obsId,expected_version:0,feature_properties:{species:'Metssiga',count:1,observed_at:new Date().toISOString(),observer:'RLS test',outside:false},feature_geometry:point()});
const {data:viewerObs,error:viewerObsError}=await viewer.from('observations').select('id').eq('id',obsId);
if(viewerObsError)throw viewerObsError;
assert(viewerObs.length===(viewerCanSeeObservations?1:0),'vaataja näeb vaatlust ainult siis, kui kiht on talle lubatud');
if(viewerCanSeeObservations){
 try{
  await rpc(admin,'set_viewer_layers',{layers:settings.viewer_layers.filter(k=>k!=='observation')});
  const {data:hidden,error:hiddenError}=await viewer.from('observations').select('id').eq('id',obsId);
  if(hiddenError)throw hiddenError;
  assert(hidden.length===0,'vaataja RLS peidab admini poolt keelatud vaatluskihi');
 }finally{await rpc(admin,'set_viewer_layers',{layers:settings.viewer_layers});}
}
const {data:viewerWrite,error:viewerWriteError}=await viewer.rpc('save_feature',{feature_kind:'observation',feature_id:id(),expected_version:0,feature_properties:{species:'Metssiga',count:1,observed_at:new Date().toISOString()},feature_geometry:point()});
assert(Boolean(viewerWriteError)&&!viewerWrite,'vaataja ei lisa vaatlust');
const changed={...props('Uuendatud test'),type:'Orientiir'};
const updated=await rpc(admin,'save_feature',{feature_kind:'place',feature_id:mapId,expected_version:1,feature_properties:changed,feature_geometry:point()});
assert(updated===2,'admin muudab objekti versioonikontrolliga');
const {data:memberEdit,error:memberEditError}=await member.rpc('save_feature',{feature_kind:'place',feature_id:mapId,expected_version:2,feature_properties:{...changed,name:'Keelatud muudatus'},feature_geometry:point()});
assert(Boolean(memberEditError)&&!memberEdit,'liige ei muuda kohakirjet');
const {data:inactiveWrite,error:inactiveWriteError}=await inactive.rpc('save_feature',{feature_kind:'observation',feature_id:id(),expected_version:0,feature_properties:{species:'Metssiga',count:1,observed_at:new Date().toISOString()},feature_geometry:point()});
assert(Boolean(inactiveWriteError)&&!inactiveWrite,'deaktiveeritud liige ei lisa vaatlust');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=','base64');
const path=`observation/${obsId}/${id()}.png`;
const {error:uploadError}=await member.storage.from('photos').upload(path,png,{contentType:'image/png',upsert:false});
assert(!uploadError,'liige lisab foto enda vaatlusele');
const {error:attachmentError}=await member.from('attachments').insert({entry_id:obsId,kind:'observation',path});
assert(!attachmentError,'liige lisab foto metaandmed enda vaatlusele');
const {data:signed,error:signedError}=await member.storage.from('photos').createSignedUrl(path,30);
assert(!signedError&&Boolean(signed?.signedUrl),'liige saab enda vaatluse fotole ajutise lingi');
const {data:adminSigned,error:adminPhotoError}=await admin.storage.from('photos').createSignedUrl(path,30);
assert(!adminPhotoError&&Boolean(adminSigned?.signedUrl),'admin saab liikme foto lingi');
const {data:viewerSigned,error:viewerPhotoError}=await viewer.storage.from('photos').createSignedUrl(path,30);
assert(viewerCanSeeObservations?(!viewerPhotoError&&Boolean(viewerSigned?.signedUrl)):Boolean(viewerPhotoError),'vaataja fotoligipääs järgib vaatluskihi õigust');
const {error:inactivePhotoError}=await inactive.storage.from('photos').createSignedUrl(path,30);
assert(Boolean(inactivePhotoError),'deaktiveeritud liige ei saa fotolinki');
const {error:viewerUploadError}=await viewer.storage.from('photos').upload(`observation/${obsId}/${id()}.png`,png,{contentType:'image/png',upsert:false});
assert(Boolean(viewerUploadError),'vaataja ei laadi fotot üles');
const {error:inactiveUploadError}=await inactive.storage.from('photos').upload(`observation/${obsId}/${id()}.png`,png,{contentType:'image/png',upsert:false});
assert(Boolean(inactiveUploadError),'deaktiveeritud liige ei laadi fotot üles');
await rpc(member,'save_feature',{feature_kind:'observation',feature_id:obsId,expected_version:1,feature_properties:{species:'Metssiga',count:2,observed_at:new Date().toISOString(),observer:'RLS test',outside:false},feature_geometry:point()});
assert(true,'liige muudab enda vaatlust');
const {data:viewerDelete,error:viewerDeleteError}=await viewer.rpc('set_deleted',{feature_kind:'observation',feature_id:obsId,expected_version:2,restore:false});
assert(Boolean(viewerDeleteError)&&viewerDelete===null,'vaataja ei kustuta vaatlust');
const {data:inactiveDelete,error:inactiveDeleteError}=await inactive.rpc('set_deleted',{feature_kind:'observation',feature_id:obsId,expected_version:2,restore:false});
assert(Boolean(inactiveDeleteError)&&inactiveDelete===null,'deaktiveeritud liige ei kustuta vaatlust');
const {data:removed,error:removedError}=await member.storage.from('photos').remove([path]);
assert(!removedError&&removed.length===1,'liige kustutab enda aktiivse vaatluse foto');
await rpc(member,'set_deleted',{feature_kind:'observation',feature_id:obsId,expected_version:2,restore:false});
assert(true,'liige kustutab enda vaatluse pehme kustutamisega');
await rpc(admin,'set_deleted',{feature_kind:'place',feature_id:mapId,expected_version:2,restore:false});
assert(true,'admin saab koha pehmelt kustutada');
console.log(results.join('\n'));
