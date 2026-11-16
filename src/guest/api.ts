import backend from '../backend-config.json';
import {cleanSnapshot,type GuestSnapshot} from './session';

const url=import.meta.env.VITE_SUPABASE_URL||backend.url;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY||backend.publishableKey;
export const guestAvailable=Boolean(url&&key);
export class GuestError extends Error{code:string;constructor(code:string){super(code);this.code=code;}}
async function call(body:Record<string,string>){
 if(!guestAvailable)throw new GuestError('unavailable');
 let response:Response;
 try{response=await fetch(url+'/functions/v1/hunt-code',{method:'POST',headers:{'Content-Type':'application/json',apikey:key},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});}
 catch{throw new GuestError('network');}
 let data:{code?:string;token?:string;snapshot?:unknown}={};
 try{data=await response.json();}catch{/* Vigane vastus käsitletakse ühenduse veana. */}
 if(!response.ok)throw new GuestError(data.code||'unavailable');
 return data;
}
/** Vahetab jahikoodi ainult vaatamiseks mõeldud pääsutähise ja jahivaate vastu. */
export async function redeemHuntCode(code:string):Promise<{token:string;snapshot:GuestSnapshot}>{
 const data=await call({action:'redeem',code});
 const snapshot=cleanSnapshot(data.snapshot);
 if(typeof data.token!=='string'||!snapshot)throw new GuestError('unavailable');
 return {token:data.token,snapshot};
}
export async function fetchGuestSnapshot(token:string):Promise<GuestSnapshot>{
 const snapshot=cleanSnapshot((await call({action:'view',token})).snapshot);
 if(!snapshot)throw new GuestError('unavailable');
 return snapshot;
}
