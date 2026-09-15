import {useState,type FormEvent} from 'react';
import {Eye,EyeOff,LoaderCircle,Lock} from 'lucide-react';
import {db} from './api';
import backend from './backend-config.json';
import type {SupabaseClient} from '@supabase/supabase-js';

type Auth=SupabaseClient['auth'];
export function passwordProblem(error:unknown,updating=false){
 const code=(error as {code?:string})?.code;
 if(code==='invalid_credentials')return 'Kasutajanimi, e-post või parool on vale. Kui parool pole veel määratud, sisene e-kirjaga.';
 if(code==='email_not_confirmed')return 'Kinnita esmalt oma e-posti aadress, sisenedes e-kirja lingiga.';
 if(code==='weak_password')return 'Vali tugevam parool: vähemalt 8 märki, näiteks mitu sõna koos numbriga.';
 if(code==='same_password')return 'Uus parool peab erinema senisest paroolist.';
 if(code==='reauthentication_needed'||code==='reauthentication_not_valid'||code==='session_not_found')return 'Parooli muutmiseks sisene uuesti e-kirjaga ning ava seejärel „Minu konto”.';
 if(code==='over_request_rate_limit')return 'Liiga palju katseid. Oota veidi ja proovi uuesti.';
 return updating?'Parooli salvestamine ebaõnnestus. Proovi uuesti või sisene uuesti e-kirjaga.':'Sisselogimine ebaõnnestus. Kontrolli ühendust ja proovi uuesti.';
}
function PasswordInput({label,value,onChange,autoComplete}:{label:string;value:string;onChange:(s:string)=>void;autoComplete:'current-password'|'new-password'}){
 const [visible,setVisible]=useState(false);
 return <label className="field"><span>{label}</span><div className="password-input"><input required type={visible?'text':'password'} autoComplete={autoComplete} minLength={autoComplete==='new-password'?8:undefined} value={value} onChange={e=>onChange(e.target.value)}/><button type="button" className="iconbtn" aria-label={visible?'Peida parool':'Näita parooli'} aria-pressed={visible} onClick={()=>setVisible(v=>!v)}>{visible?<EyeOff size={20}/>:<Eye size={20}/>}</button></div></label>;
}
export function PasswordLogin({auth,email,setEmail,onEmailLogin,onSuccess}:{auth:Auth;email:string;setEmail:(s:string)=>void;onEmailLogin:()=>void;onSuccess:()=>void}){
 const [password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(e:FormEvent){e.preventDefault();if(busy)return;setBusy(true);setError('');try{if(email.includes('@')){const {error}=await auth.signInWithPassword({email:email.trim(),password});if(error)throw error;}else{const url=import.meta.env.VITE_SUPABASE_URL||backend.url;const response=await fetch(url+'/functions/v1/username-login',{method:'POST',headers:{'Content-Type':'application/json',apikey:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||backend.publishableKey},body:JSON.stringify({username:email.trim(),password}),signal:AbortSignal.timeout(25000)});const data=await response.json();if(!response.ok)throw data;const {error}=await auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token});if(error)throw error;}setPassword('');onSuccess();}catch(e){setError(passwordProblem(e));}finally{setBusy(false);}}
 return <form onSubmit={submit}><label className="field"><span>Kasutajanimi või e-post</span><input autoFocus type="text" autoCapitalize="none" spellCheck={false} autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><PasswordInput label="Parool" value={password} onChange={setPassword} autoComplete="current-password"/>{error&&<p className="notice" role="alert">{error}</p>}<button className="primary full" disabled={busy}>{busy?<LoaderCircle className="spin"/>:<Lock size={18}/>} Logi sisse</button><button type="button" className="subtle" disabled={busy} onClick={onEmailLogin}>Parool ununes või on veel määramata? Sisene e-kirjaga</button></form>;
}
export function PasswordSettings({auth,email,onSuccess}:{auth:Auth;email:string;onSuccess:()=>void}){
 const [password,setPassword]=useState(''),[again,setAgain]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(e:FormEvent){e.preventDefault();if(busy)return;setError('');if(password.length<8){setError('Parool peab olema vähemalt 8 märki pikk.');return;}if(password!==again){setError('Sisestatud paroolid ei ühti.');return;}setBusy(true);try{const {error}=await auth.updateUser({password});if(error)throw error;setPassword('');setAgain('');onSuccess();}catch(e){setError(passwordProblem(e,true));}finally{setBusy(false);}}
 return <form onSubmit={submit}><p>Pärast salvestamist saad sisse logida oma e-posti aadressi ja parooliga.</p><label className="field"><span>E-posti aadress</span><input type="email" autoComplete="username" value={email} readOnly/></label><PasswordInput label="Uus parool · vähemalt 8 märki" value={password} onChange={setPassword} autoComplete="new-password"/><PasswordInput label="Korda uut parooli" value={again} onChange={setAgain} autoComplete="new-password"/>{error&&<p className="notice" role="alert">{error}</p>}<button className="primary full" disabled={busy}>{busy?<LoaderCircle className="spin"/>:<Lock size={18}/>} Salvesta parool</button></form>;
}

export function UsernameSettings({initial,userId,onSaved}:{initial:string;userId:string;onSaved:(name:string)=>void}){
 const [value,setValue]=useState(initial),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function save(e:FormEvent){e.preventDefault();if(!db||busy)return;const username=value.trim().toLowerCase();if(!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(username)){setMessage('Kasuta 3–30 märki: a–z, numbrid, punkt, sidekriips või alakriips. Alusta tähe või numbriga.');return;}setBusy(true);setMessage('');try{const {data,error}=await db.from('memberships').update({username}).eq('user_id',userId).select('username').single();if(error)throw error;setValue(data.username);onSaved(data.username);setMessage('Kasutajanimi salvestatud. Võid sisse logida kasutajanime või e-postiga.');}catch(e){setMessage((e as {code?:string}).code==='23505'?'See kasutajanimi on juba kasutusel. Vali teine.':'Salvestamine ebaõnnestus. Proovi uuesti.');}finally{setBusy(false);}}
 return <form className="username-settings" onSubmit={save}><label className="field"><span>Kasutajanimi</span><input type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} minLength={3} maxLength={30} required value={value} onChange={e=>setValue(e.target.value)}/></label><p className="muted">Valikuline. 3–30 märki: a–z, numbrid, punkt, sidekriips või alakriips. Suur- ja väiketähed ei eristu. E-post ja parool jäävad samaks.</p>{message&&<p className="notice" role="status">{message}</p>}<button type="submit" disabled={busy}>{busy?'Salvestan…':'Salvesta kasutajanimi'}</button></form>;
}
