import {useEffect,useState} from 'react';
import {createHuntAccessCode,getHuntAccessCode,revokeHuntAccessCode,type HuntAccessCode} from './api';

/** Jahijuhi ja admini vaade: loo, jaga või tühista jahi neljakohaline vaatamiskood. */
export function HuntAccessCodePanel({huntId,huntTitle}:{huntId:string;huntTitle:string}){
 const [current,setCurrent]=useState<HuntAccessCode|null>(null),[loaded,setLoaded]=useState(false),[working,setWorking]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{let active=true;setLoaded(false);setCurrent(null);setMessage('');getHuntAccessCode(huntId).then(code=>{if(active){setCurrent(code);setLoaded(true);}}).catch(e=>{if(active){setMessage('Jahikoodi laadimine ebaõnnestus: '+(e instanceof Error?e.message:String(e?.message||e)));setLoaded(true);}});return()=>{active=false;};},[huntId]);
 async function run(action:()=>Promise<HuntAccessCode|null>,done:string){if(working)return;setWorking(true);setMessage('');try{setCurrent(await action());setMessage(done);}catch(e){setMessage('Toiming ebaõnnestus: '+(e instanceof Error?e.message:String((e as {message?:string})?.message||e)));}finally{setWorking(false);}}
 const invitation=current?`${huntTitle}: ava ${location.origin+import.meta.env.BASE_URL} ja sisesta jahikood ${current.code}. Kood näitab sinu kohta ja naabreid.`:'';
 async function share(){try{if(navigator.share)await navigator.share({text:invitation});else{await navigator.clipboard.writeText(invitation);setMessage('Kutse kopeeritud. Kleebi see jahimeeste vestlusesse.');}}catch{/* Kasutaja katkestas jagamise. */}}
 return <div className="hunt-roster hunt-access-code" aria-label="Jahikood">
  <h3>Jahikood osalejatele</h3>
  <p className="muted">Koodiga saab ilma kontota vaadata selle jahi paigutust: oma kohta ja naabreid. Koodiga ei saa midagi muuta ega näe seltsi muid andmeid. Kood kehtib 48 tundi või kuni jahi lõpetamiseni.</p>
  {!loaded?<p className="muted">Laadin…</p>:current?<>
   <output className="hunt-access-code-value" aria-label={'Kehtiv jahikood '+current.code.split('').join(' ')}>{current.code}</output>
   <p className="muted">Kehtib kuni {new Date(current.expires_at).toLocaleString('et-EE',{timeZone:'Europe/Tallinn',weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
   <button type="button" className="primary" disabled={working} onClick={()=>void share()}>Jaga kutset</button>
   <button type="button" disabled={working} onClick={()=>{if(window.confirm('Luua uus kood? Praegune kood lakkab kohe töötamast ja avatud vaated sulguvad.'))void run(()=>createHuntAccessCode(huntId),'Uus jahikood loodud.');}}>Loo uus kood</button>
   <button type="button" disabled={working} onClick={()=>{if(window.confirm('Tühistada jahikood? Koodiga avatud vaated sulguvad.'))void run(async()=>{await revokeHuntAccessCode(huntId);return null;},'Jahikood tühistatud.');}}>Tühista kood</button>
  </>:<button type="button" className="primary" disabled={working} onClick={()=>void run(()=>createHuntAccessCode(huntId),'Jahikood loodud.')}>Loo jahikood</button>}
  {message&&<p role="status" className="notice">{message}</p>}
 </div>;
}
