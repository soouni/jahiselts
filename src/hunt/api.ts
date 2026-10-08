import {db} from '../api';
import type {HuntType} from './types';
export type HuntDraft={title:string;type:HuntType;allowSelfSelection:boolean;drives:{title:string}[]};
export async function createHunt(draft:HuntDraft){
 if(!db)throw new Error('Andmebaasi ühendus puudub.');
 const {data:userResult,error:userError}=await db.auth.getUser();
 if(userError||!userResult.user)throw new Error('Jahi loomiseks logi sisse.');
 const {data:hunt,error}=await db.from('hunts').insert({
  title:draft.title.trim(),type:draft.type,leader_id:userResult.user.id,allow_self_selection:draft.allowSelfSelection
 }).select('id').single();
 if(error)throw error;
 const {error:driveError}=await db.from('hunt_drives').insert(draft.drives.map((d,i)=>({hunt_id:hunt.id,sequence:i+1,title:d.title.trim()})));
 if(driveError)throw new Error('Jaht loodi, kuid ajude salvestamine ebaõnnestus. Jahi ID: '+hunt.id+'. '+driveError.message);
 return hunt.id as string;
}
export async function listHunts(){
 if(!db)throw new Error('Andmebaasi ühendus puudub.');
 const {data,error}=await db.from('hunts').select('id,title,type,status,leader_id,allow_self_selection,created_at,hunt_drives(id,sequence,title,status)').order('created_at',{ascending:false}).limit(40);
 if(error)throw error;
 return data||[];
}

export type ClubChoice={user_id:string;display_name:string};
export type HuntDriveRow={id:string;sequence:number;title:string;status:string};
export type HuntRow={id:string;title:string;type:string;status:string;leader_id:string;allow_self_selection:boolean;hunt_drives:HuntDriveRow[]};
export type HuntPersonRow={id:string;hunt_id:string;user_id:string|null;display_name:string;role:string;status:string;roster_id:string|null};
export type HuntPositionRow={id:string;drive_id:string;number:number;location:{type:'Point';coordinates:[number,number]};assigned_participant_id:string|null;confirmed_at:string|null};
export async function huntChoices():Promise<ClubChoice[]>{
 if(!db)throw new Error('Andmebaasi ühendus puudub.');
 const {data,error}=await db.rpc('hunt_member_choices');if(error)throw error;return data||[];
}
export async function huntPeople(huntId:string):Promise<HuntPersonRow[]>{
 if(!db)throw new Error('Andmebaasi ühendus puudub.');
 const {data,error}=await db.from('hunt_participants').select('*').eq('hunt_id',huntId).order('display_name');if(error)throw error;return data||[];
}
export async function addHuntPerson(huntId:string,person:ClubChoice,role:'hunter'|'driver'|'dog_driver'|'leader'){
 if(!db)throw new Error('Andmebaasi ühendus puudub.');
 const {error}=await db.from('hunt_participants').insert({hunt_id:huntId,user_id:person.user_id,display_name:person.display_name,role});if(error)throw error;
}
export async function huntPositions(driveId:string):Promise<HuntPositionRow[]>{
 if(!db)throw new Error('Andmebaasi ühendus puudub.');
 const {data,error}=await db.from('hunt_positions').select('*').eq('drive_id',driveId).order('number');if(error)throw error;return data||[];
}
export async function addHuntPosition(driveId:string,number:number,coordinates:[number,number],personId:string|null){
 if(!db)throw new Error('Andmebaasi ühendus puudub.');
 const {error}=await db.from('hunt_positions').insert({drive_id:driveId,number,location:{type:'Point',coordinates},assigned_participant_id:personId});if(error)throw error;
}
export async function assignHuntPosition(positionId:string,personId:string|null){
 if(!db)throw new Error('Andmebaasi ühendus puudub.');
 const {error}=await db.from('hunt_positions').update({assigned_participant_id:personId,confirmed_at:null}).eq('id',positionId);if(error)throw error;
}

export async function removeHuntPerson(personId:string){
 if(!db)throw new Error('Andmebaasi ühendus puudub.');
 const {error:clearError}=await db.from('hunt_positions').update({assigned_participant_id:null,confirmed_at:null}).eq('assigned_participant_id',personId);
 if(clearError)throw clearError;
 const {error}=await db.from('hunt_participants').delete().eq('id',personId);
 if(error)throw error;
}
export async function moveHuntPosition(positionId:string,coordinates:[number,number]){
 if(!db)throw new Error('Andmebaasi ühendus puudub.');
 const {error}=await db.from('hunt_positions').update({location:{type:'Point',coordinates},confirmed_at:null,confirmation_accuracy_m:null,confirmation_distance_m:null}).eq('id',positionId);
 if(error)throw error;
}
export async function removeHuntPosition(positionId:string){
 if(!db)throw new Error('Andmebaasi ühendus puudub.');
 const {error}=await db.from('hunt_positions').delete().eq('id',positionId);
 if(error)throw error;
}

export type RosterPerson={id:string;user_id:string|null;display_name:string;default_role:'hunter'|'driver'|'dog_driver'};
export async function listRoster():Promise<RosterPerson[]>{
 if(!db)throw new Error('Andmebaasi ühendus puudub.');
 const {data,error}=await db.from('hunt_roster').select('id,user_id,display_name,default_role').order('display_name');
 if(error)throw error;return data||[];
}
export async function addRosterPerson(name:string,role:'hunter'|'driver'|'dog_driver',userId?:string){
 if(!db)throw new Error('Andmebaasi ühendus puudub.');
 const {error}=await db.from('hunt_roster').insert({display_name:name.trim(),default_role:role,user_id:userId||null});if(error)throw error;
}
export async function removeRosterPerson(id:string){
 if(!db)throw new Error('Andmebaasi ühendus puudub.');
 const {error}=await db.from('hunt_roster').delete().eq('id',id);if(error)throw error;
}
export async function setRosterRole(id:string,role:'hunter'|'driver'|'dog_driver'){
 if(!db)throw new Error('Andmebaasi ühendus puudub.');
 const {error}=await db.from('hunt_roster').update({default_role:role}).eq('id',id);if(error)throw error;
}
export async function addRosterParticipant(huntId:string,person:RosterPerson){
 if(!db)throw new Error('Andmebaasi ühendus puudub.');
 const {error}=await db.from('hunt_participants').insert({hunt_id:huntId,roster_id:person.id,user_id:person.user_id,display_name:person.display_name,role:person.default_role});if(error)throw error;
}
export async function createHuntFromPrevious(previous:HuntRow,title:string){
 if(!db)throw new Error('Andmebaasi ühendus puudub.');
 const drives=previous.hunt_drives.slice().sort((a,b)=>a.sequence-b.sequence).map(d=>({title:d.title}));
 const id=await createHunt({title,type:previous.type as HuntType,allowSelfSelection:previous.allow_self_selection,drives:drives.length?drives:[{title:'Aju 1'}]});
 const {data,error}=await db.from('hunt_participants').select('user_id,roster_id,display_name,role').eq('hunt_id',previous.id);
 if(error)throw new Error('Uus jaht loodi, aga osalejate lugemine ebaõnnestus: '+error.message);
 if(data?.length){const {error:copyError}=await db.from('hunt_participants').insert(data.map(p=>({...p,hunt_id:id})));if(copyError)throw new Error('Uus jaht loodi, aga osalejate kopeerimine ebaõnnestus: '+copyError.message);}
 return id;
}
