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
