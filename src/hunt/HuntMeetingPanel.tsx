import {useEffect,useState} from 'react';
import {saveHuntMeeting,type HuntMeeting,type HuntRow} from './api';

/** ISO-aeg <-> <input type="datetime-local"> väärtus seadme kohalikus ajas. */
function toLocalInput(iso:string|null|undefined){if(!iso)return '';const date=new Date(iso);if(!Number.isFinite(date.getTime()))return '';return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);}
function fromLocalInput(value:string){if(!value)return null;const date=new Date(value);return Number.isFinite(date.getTime())?date.toISOString():null;}

type Props={hunt:HuntRow;disabled:boolean;picking:boolean;onPick:()=>void;onCancelPick:()=>void;onSaved:(meeting:HuntMeeting,message:string)=>void};
/** Jahijuhi sisestus: kus ja mis kell kogunetakse. Jahikoodiga osaleja näeb seda oma vaates. */
export function HuntMeetingPanel({hunt,disabled,picking,onPick,onCancelPick,onSaved}:Props){
 const [time,setTime]=useState(toLocalInput(hunt.meeting_at)),[note,setNote]=useState(hunt.meeting_note||''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setTime(toLocalInput(hunt.meeting_at));setNote(hunt.meeting_note||'');setError('');},[hunt.id,hunt.meeting_at,hunt.meeting_note]);
 const changed=time!==toLocalInput(hunt.meeting_at)||note.trim()!==(hunt.meeting_note||'');
 async function run(values:Partial<HuntMeeting>,message:string){if(busy||disabled)return;setBusy(true);setError('');try{onSaved(await saveHuntMeeting(hunt.id,values),message);}catch(e){setError('Salvestamine ebaõnnestus: '+(e instanceof Error?e.message:String((e as {message?:string})?.message||e)));}finally{setBusy(false);}}
 const point=hunt.meeting_point?.coordinates;
 return <div className="hunt-roster hunt-meeting" aria-label="Kogunemine">
  <h3>Kogunemine</h3>
  <p className="muted">Kogunemise aeg ja koht on nähtavad kõigile, kes sisenevad jahikoodiga.</p>
  <label className="field"><span>Kogunemise aeg</span><input type="datetime-local" value={time} disabled={disabled||busy} onChange={e=>setTime(e.target.value)}/></label>
  <label className="field"><span>Koha kirjeldus (valikuline)</span><input value={note} maxLength={200} placeholder="nt Jahimaja parkla" disabled={disabled||busy} onChange={e=>setNote(e.target.value)}/></label>
  <button type="button" className="primary" disabled={disabled||busy||!changed} onClick={()=>void run({meeting_at:fromLocalInput(time),meeting_note:note.trim()||null},'Kogunemise aeg ja kirjeldus salvestatud.')}>{busy?'Salvestan…':'Salvesta aeg ja kirjeldus'}</button>
  <p className="muted">{point?'Kogunemiskoht on kaardil määratud ('+point[1].toFixed(4)+', '+point[0].toFixed(4)+').':'Kogunemiskohta ei ole kaardil määratud.'}</p>
  {picking?<p role="status">Puuduta kaardil kogunemiskohta. <button type="button" onClick={onCancelPick}>Tühista</button></p>:<button type="button" disabled={disabled||busy} onClick={onPick}>{point?'Muuda kogunemiskohta kaardil':'Määra kogunemiskoht kaardil'}</button>}
  {point&&!picking&&<button type="button" disabled={disabled||busy} onClick={()=>{if(window.confirm('Eemaldada kogunemiskoht kaardilt?'))void run({meeting_point:null},'Kogunemiskoht eemaldatud.');}}>Eemalda koht kaardilt</button>}
  {error&&<p role="alert" className="notice">{error}</p>}
 </div>;
}
