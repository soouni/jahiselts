/** Jahikoodiga külalise seadmesse salvestatud vaade. Sisaldab ainult vaatamiseks mõeldud andmeid. */
export type GuestPosition={id:string;number:number;coordinates:[number,number];role:string;name:string};
export type GuestArea={type:'Polygon';coordinates:[number,number][][]};
export type GuestSnapshot={hunt:{title:string;status:string};drive:{sequence:number;title:string;status:string;area:GuestArea|null}|null;positions:GuestPosition[];expires_at:string;generated_at:string};
export type GuestSession={token:string;snapshot:GuestSnapshot;savedAt:number;myPositionId:string|null};
type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
const KEY='parnjoe-jahikood-v1';

export function validCode(value:string){return /^[0-9]{4}$/.test(value);}
function validPoint(value:unknown):value is [number,number]{return Array.isArray(value)&&value.length===2&&value.every(Number.isFinite)&&Math.abs(value[0])<=180&&Math.abs(value[1])<=90;}
/** Serveri vastust ei usaldata pimesi: vigased read jäetakse kaardilt välja. */
export function cleanSnapshot(value:unknown):GuestSnapshot|null{
 const raw=value as GuestSnapshot|null;
 if(!raw||typeof raw!=='object'||typeof raw.hunt?.title!=='string'||!Array.isArray(raw.positions)||!Number.isFinite(Date.parse(raw.expires_at)))return null;
 const positions=raw.positions.filter(p=>p&&typeof p.id==='string'&&Number.isInteger(p.number)&&typeof p.name==='string'&&typeof p.role==='string'&&validPoint(p.coordinates)).map(p=>({id:p.id,number:p.number,coordinates:[p.coordinates[0],p.coordinates[1]] as [number,number],role:p.role,name:p.name.slice(0,80)}));
 const drive=raw.drive&&typeof raw.drive.title==='string'?{sequence:Number(raw.drive.sequence)||1,title:raw.drive.title,status:String(raw.drive.status||''),area:raw.drive.area?.type==='Polygon'&&Array.isArray(raw.drive.area.coordinates)?raw.drive.area:null}:null;
 return {hunt:{title:raw.hunt.title,status:String(raw.hunt.status||'')},drive,positions,expires_at:raw.expires_at,generated_at:typeof raw.generated_at==='string'?raw.generated_at:new Date().toISOString()};
}
export function readGuestSession(storage:Store,now=Date.now()):GuestSession|null{
 try{
  const saved=JSON.parse(storage.getItem(KEY)||'null');
  if(!saved)return null;
  const snapshot=cleanSnapshot(saved.snapshot);
  if(typeof saved.token!=='string'||!snapshot||Date.parse(snapshot.expires_at)<=now){clearGuestSession(storage);return null;}
  return {token:saved.token,snapshot,savedAt:Number(saved.savedAt)||now,myPositionId:typeof saved.myPositionId==='string'?saved.myPositionId:null};
 }catch{return null;}
}
export function saveGuestSession(storage:Store,session:GuestSession){try{storage.setItem(KEY,JSON.stringify(session));}catch{/* Salvestusruum pole saadaval: vaade töötab ainult selle lehe avamise ajal. */}}
export function clearGuestSession(storage:Store){try{storage.removeItem(KEY);}catch{/* Salvestusruum pole saadaval. */}}
export function roleLabel(role:string){return role==='dog_driver'?'Ajaja koeraga':role==='driver'?'Ajaja':role==='leader'?'Jahijuht':'Kütt';}
export function isDriver(role:string){return role==='driver'||role==='dog_driver';}
/** Suund ilmakaarena: välitingimustes on see arusaadavam kui kraadid. */
export function compassWord(bearing:number){
 const names=['põhja','kirde','ida','kagu','lõuna','edela','lääne','loode'];
 return names[Math.round((((bearing%360)+360)%360)/45)%8]+' suunas';
}
export function guestProblem(code:string|undefined){
 if(code==='invalid_code')return 'Kood on vale või aegunud. Küsi jahijuhilt kehtiv kood.';
 if(code==='over_request_rate_limit')return 'Sellest seadmest tehti liiga palju katseid. Oota 15 minutit ja proovi uuesti.';
 if(code==='temporarily_locked')return 'Sisenemine on hetkeks suletud, sest kogu süsteemis tehti liiga palju valesid katseid. Proovi tunni aja pärast uuesti või küsi jahijuhilt.';
 if(code==='guest_expired')return 'Jahikood on aegunud või jaht on lõpetatud.';
 return 'Ühendus ebaõnnestus. Kontrolli võrku ja proovi uuesti.';
}
