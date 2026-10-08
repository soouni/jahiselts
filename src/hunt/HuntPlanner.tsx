import {useState} from 'react';
import type {HuntType} from './types';

type DraftDrive={id:string;title:string;positions:number};
type DraftHunt={title:string;type:HuntType;allowSelfSelection:boolean;drives:DraftDrive[]};
const initial:DraftHunt={title:'',type:'drive',allowSelfSelection:false,drives:[{id:'1',title:'Aju 1',positions:0}]};

/** Kohalik planeerimisvaade. Andmebaasiga ühendamine tuleb järgmises etapis. */
export function HuntPlanner(){
 const [draft,setDraft]=useState<DraftHunt>(initial);
 const [notice,setNotice]=useState('');
 const addDrive=()=>setDraft(h=>({...h,drives:[...h.drives,{id:crypto.randomUUID(),title:'Aju '+(h.drives.length+1),positions:0}]}));
 return <section aria-label="Jahi planeerimine">
  <p className="muted">Esimene arendusversioon: jahi kavandamine. Andmeid veel serverisse ei salvestata.</p>
  <label className="field"><span>Jahi nimi</span><input value={draft.title} maxLength={120} placeholder="Näiteks laupäevane ühisjaht" onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
  <label className="field"><span>Jahiliik</span><select value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value as HuntType})}><option value="drive">Ajujaht</option><option value="stand">Varitsusjaht</option><option value="other">Muu</option></select></label>
  <label className="checkrow"><span>Luba jahimeestel ise vaba positsiooni valida</span><input type="checkbox" checked={draft.allowSelfSelection} onChange={e=>setDraft({...draft,allowSelfSelection:e.target.checked})}/></label>
  <h3>Järjestikused ajud</h3>
  {draft.drives.map((d,i)=><div className="memberrow" key={d.id}><strong>{i+1}.</strong><input aria-label={'Aju '+(i+1)+' nimi'} value={d.title} maxLength={100} onChange={e=>setDraft(h=>({...h,drives:h.drives.map(x=>x.id===d.id?{...x,title:e.target.value}:x)}))}/><button type="button" disabled={draft.drives.length===1} onClick={()=>setDraft(h=>({...h,drives:h.drives.filter(x=>x.id!==d.id)}))}>Eemalda</button></div>)}
  <button type="button" onClick={addDrive}>+ Lisa järgmine aju</button>
  <p className="muted">Positsioonid, eesnimed, GPS-kinnitused ja jahijuhi teated lisanduvad järgmistes etappides. Korraga saab aktiivne olla üks aju.</p>
  <button type="button" className="primary full" onClick={()=>setNotice(draft.title.trim()?'Jahi kavand on koostatud. Serverisse salvestamine lisandub pärast õigustega andmebaasi ühendamist.':'Sisesta kõigepealt jahi nimi.')} >Kontrolli kavandit</button>
  {notice&&<p role="status" className="notice">{notice}</p>}
 </section>;
}
