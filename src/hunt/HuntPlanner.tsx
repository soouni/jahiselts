import {createHunt,listHunts} from './api';
import {useEffect} from 'react';
import {useState} from 'react';
import type {HuntType} from './types';

type DraftDrive={id:string;title:string;positions:number};
type DraftHunt={title:string;type:HuntType;allowSelfSelection:boolean;drives:DraftDrive[]};
const initial:DraftHunt={title:'',type:'drive',allowSelfSelection:false,drives:[{id:'1',title:'Aju 1',positions:0}]};

/** Kohalik planeerimisvaade. Andmebaasiga ühendamine tuleb järgmises etapis. */
export function HuntPlanner(){
 const [draft,setDraft]=useState<DraftHunt>(initial);
 const [notice,setNotice]=useState('');
 const [saving,setSaving]=useState(false);
 const [existing,setExisting]=useState<{id:string;title:string;status:string}[]>([]);
 useEffect(()=>{let active=true;listHunts().then(rows=>{if(active)setExisting(rows);}).catch(e=>{if(active)setNotice('Jahipäevade laadimine: '+e.message);});return()=>{active=false;};},[]);
 async function save(){if(!draft.title.trim()||draft.drives.some(d=>!d.title.trim())){setNotice('Sisesta jahi ja kõigi ajude nimed.');return;}setSaving(true);setNotice('');try{const id=await createHunt({title:draft.title,type:draft.type,allowSelfSelection:draft.allowSelfSelection,drives:draft.drives});setNotice('Jaht salvestatud! ID: '+id);setExisting(await listHunts());setDraft(initial);}catch(e){setNotice('Salvestamine ebaõnnestus: '+(e instanceof Error?e.message:String(e)));}finally{setSaving(false);}}

 const addDrive=()=>setDraft(h=>({...h,drives:[...h.drives,{id:crypto.randomUUID(),title:'Aju '+(h.drives.length+1),positions:0}]}));
 return <section aria-label="Jahi planeerimine">
  <p className="muted">Loo jahipäev ja järjestikused ajud. Positsioonide kaardile määramine lisandub järgmises etapis.</p>
  <label className="field"><span>Jahi nimi</span><input value={draft.title} maxLength={120} placeholder="Näiteks laupäevane ühisjaht" onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
  <label className="field"><span>Jahiliik</span><select value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value as HuntType})}><option value="drive">Ajujaht</option><option value="stand">Varitsusjaht</option><option value="other">Muu</option></select></label>
  <label className="checkrow"><span>Luba jahimeestel ise vaba positsiooni valida</span><input type="checkbox" checked={draft.allowSelfSelection} onChange={e=>setDraft({...draft,allowSelfSelection:e.target.checked})}/></label>
  <h3>Järjestikused ajud</h3>
  {draft.drives.map((d,i)=><div className="memberrow" key={d.id}><strong>{i+1}.</strong><input aria-label={'Aju '+(i+1)+' nimi'} value={d.title} maxLength={100} onChange={e=>setDraft(h=>({...h,drives:h.drives.map(x=>x.id===d.id?{...x,title:e.target.value}:x)}))}/><button type="button" disabled={draft.drives.length===1} onClick={()=>setDraft(h=>({...h,drives:h.drives.filter(x=>x.id!==d.id)}))}>Eemalda</button></div>)}
  <button type="button" onClick={addDrive}>+ Lisa järgmine aju</button>
  <p className="muted">Positsioonid, eesnimed, GPS-kinnitused ja jahijuhi teated lisanduvad järgmistes etappides. Korraga saab aktiivne olla üks aju.</p>
  <button type="button" className="primary full" onClick={save} disabled={saving}>{saving?'Salvestan…':'Salvesta jaht'}</button>
  {notice&&<p role="status" className="notice">{notice}</p>}
  <h3>Salvestatud jahid</h3>{existing.length?existing.map(h=><div className="memberrow" key={h.id}><strong>{h.title}</strong><small>{h.status}</small></div>):<p className="muted">Jahte veel ei ole.</p>}
 </section>;
}
