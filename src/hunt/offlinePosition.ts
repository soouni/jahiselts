/** Opt-in, account-scoped snapshot. Never persists other participants or live GPS. */
export type OfflinePosition={version:1;userId:string;huntId:string;driveId:string;title:string;number:number;coordinates:[number,number];savedAt:number;expiresAt:number;base:string};
const PREFIX='parnjoe-own-position-v1:';
const LAST_OWNER=PREFIX+'last-owner';
export const OFFLINE_POSITION_TTL=12*60*60*1000;
type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export function readOfflinePosition(storage:Store,userId:string,now=Date.now()):OfflinePosition|null{
 if(!userId)return null;
 try{const value=JSON.parse(storage.getItem(PREFIX+userId)||'null');
  if(!value||value.version!==1||value.userId!==userId||typeof value.title!=='string'||value.title.length>250||typeof value.huntId!=='string'||typeof value.driveId!=='string'||!Number.isInteger(value.number)||value.number<1||!Array.isArray(value.coordinates)||value.coordinates.length!==2||!value.coordinates.every(Number.isFinite)||Math.abs(value.coordinates[0])>180||Math.abs(value.coordinates[1])>90||!Number.isFinite(value.savedAt)||!Number.isFinite(value.expiresAt)||value.savedAt>now+5000||value.expiresAt<=now||value.expiresAt-value.savedAt>OFFLINE_POSITION_TTL){storage.removeItem(PREFIX+userId);return null;}
  return value;
 }catch{return null;}
}
export function saveOfflinePosition(storage:Store,position:Omit<OfflinePosition,'version'|'savedAt'|'expiresAt'>,now=Date.now()){
 const snapshot:OfflinePosition={version:1,userId:position.userId,huntId:position.huntId,driveId:position.driveId,title:position.title,number:position.number,coordinates:[...position.coordinates],base:position.base,savedAt:now,expiresAt:now+OFFLINE_POSITION_TTL};
 storage.setItem(PREFIX+position.userId,JSON.stringify(snapshot));storage.setItem(LAST_OWNER,position.userId);return snapshot;
}
export function readLastOfflinePosition(storage:Store,now=Date.now()):OfflinePosition|null{
 try{const owner=storage.getItem(LAST_OWNER);return owner?readOfflinePosition(storage,owner,now):null;}catch{return null;}
}
export function clearOfflinePosition(storage:Store,userId:string){try{if(userId){storage.removeItem(PREFIX+userId);if(storage.getItem(LAST_OWNER)===userId)storage.removeItem(LAST_OWNER);}}catch{/* A blocked store cannot hold a readable snapshot. */}}
