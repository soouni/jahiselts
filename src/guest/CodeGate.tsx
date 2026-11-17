import {useEffect,useRef,useState,type FormEvent} from 'react';
import {KeyRound,LoaderCircle,LogIn,MapPinned,Trees} from 'lucide-react';
import {GuestError,guestAvailable,redeemHuntCode} from './api';
import {guestProblem,validCode,type GuestSnapshot} from './session';

type Props={notice?:string;onGuest:(token:string,snapshot:GuestSnapshot)=>void;onLogin:()=>void;onPublicMap:()=>void};
/** Avaleht: jahikoodi sisestamine. Kontoga sisenemine on jahijuhtidele ja adminidele eraldi nupu taga. */
export function CodeGate({notice='',onGuest,onLogin,onPublicMap}:Props){
 const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const input=useRef<HTMLInputElement>(null);
 // Fookus tagasi alles siis, kui väli pole enam keelatud: `disabled` väljale fookust ei saa.
 useEffect(()=>{if(!busy&&error)input.current?.focus();},[busy,error]);
 async function submit(value:string){
  if(busy||!validCode(value))return;
  setBusy(true);setError('');
  try{const result=await redeemHuntCode(value);onGuest(result.token,result.snapshot);}
  catch(e){setError(guestProblem(e instanceof GuestError?e.code:undefined));setCode('');}
  finally{setBusy(false);}
 }
 function change(value:string){const digits=value.replace(/\D/g,'').slice(0,4);setCode(digits);if(digits.length===4)void submit(digits);}
 return <main className="code-gate">
  <form className="code-gate-card" onSubmit={(e:FormEvent)=>{e.preventDefault();void submit(code);}}>
   <div className="code-gate-brand"><div className="brandicon"><Trees size={26}/></div><div><strong>Pärnjõe</strong><span>JAHISELTSI KAART</span></div></div>
   <h1>Sisesta jahikood</h1>
   <p className="muted">Neljakohalise koodi saad jahijuhilt. Koodiga näed, kuhu sind on paigutatud ja kes on sinu kõrval.</p>
   {notice&&<p className="notice" role="status">{notice}</p>}
   <label className="code-gate-field"><span>Jahikood</span><input ref={input} autoFocus inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="one-time-code" aria-describedby={error?'code-gate-error':undefined} aria-invalid={Boolean(error)} disabled={busy||!guestAvailable} value={code} onChange={e=>change(e.target.value)} placeholder="••••"/></label>
   {error&&<p id="code-gate-error" className="notice" role="alert">{error}</p>}
   {!guestAvailable&&<p className="notice">Jahikoodiga sisenemine ei ole veel andmebaasiga ühendatud.</p>}
   <button className="primary full" disabled={busy||!validCode(code)}>{busy?<LoaderCircle className="spin"/>:<KeyRound size={18}/>} Ava jaht</button>
   <div className="code-gate-links">
    <button type="button" className="subtle" onClick={onLogin}><LogIn size={16}/> Jahijuht või admin: logi sisse</button>
    <button type="button" className="subtle" onClick={onPublicMap}><MapPinned size={16}/> Vaata avalikku jahiala kaarti</button>
   </div>
  </form>
 </main>;
}
