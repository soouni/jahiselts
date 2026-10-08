import {listRoster,addRosterPerson,removeRosterPerson,setRosterRole,addRosterParticipant,createHuntFromPrevious} from './api';
import type {RosterPerson} from './api';
import {HuntPositionMap} from './HuntPositionMap';
import {huntChoices,huntPeople,addHuntPerson,huntPositions,addHuntPosition,assignHuntPosition,removeHuntPerson,moveHuntPosition,removeHuntPosition} from './api';
import type {ClubChoice,HuntRow,HuntPersonRow,HuntPositionRow} from './api';
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
 const [selected,setSelected]=useState<HuntRow|null>(null);
 const [driveId,setDriveId]=useState('');
 const [people,setPeople]=useState<HuntPersonRow[]>([]);
 const [choices,setChoices]=useState<ClubChoice[]>([]);
 const [positions,setPositions]=useState<HuntPositionRow[]>([]);
 const [personChoice,setPersonChoice]=useState('');
 const [personRole,setPersonRole]=useState<'hunter'|'driver'>('hunter');
 const [positionPerson,setPositionPerson]=useState('');
 const [placing,setPlacing]=useState(false);
 const [movingId,setMovingId]=useState<string|null>(null);
 const [working,setWorking]=useState(false);
 const [roster,setRoster]=useState<RosterPerson[]>([]);
 const [newName,setNewName]=useState('');
 const [newRole,setNewRole]=useState<'hunter'|'driver'>('hunter');
 const [rosterOpen,setRosterOpen]=useState(false);
 const [fullMap,setFullMap]=useState(false);
 useEffect(()=>{listRoster().then(setRoster).catch(e=>setNotice('Nimekirja laadimine: '+String(e)));},[]);
 async function createRosterEntry(){if(!newName.trim())return;setWorking(true);try{await addRosterPerson(newName,newRole);setRoster(await listRoster());setNewName('');}catch(e){setNotice(String(e));}finally{setWorking(false);}}
 async function toggleParticipant(person:RosterPerson,active:boolean){if(!selected)return;setWorking(true);try{if(active)await addRosterParticipant(selected.id,person);else{const participant=people.find(p=>p.roster_id===person.id||!!person.user_id&&p.user_id===person.user_id);if(participant)await removeHuntPerson(participant.id);}setPeople(await huntPeople(selected.id));if(driveId)setPositions(await huntPositions(driveId));}catch(e){setNotice(String(e));}finally{setWorking(false);}}
 async function changeRosterRole(person:RosterPerson,role:'hunter'|'driver'){setWorking(true);try{await setRosterRole(person.id,role);setRoster(await listRoster());}catch(e){setNotice(String(e));}finally{setWorking(false);}}
 async function deleteRosterEntry(person:RosterPerson){if(!window.confirm('Eemaldada '+person.display_name+' püsivast nimekirjast?'))return;setWorking(true);try{await removeRosterPerson(person.id);setRoster(await listRoster());}catch(e){setNotice(String(e));}finally{setWorking(false);}}
 async function copyPrevious(h:HuntRow){const title=window.prompt('Uue jahi nimi',h.title+' – uus jaht');if(!title?.trim())return;setWorking(true);try{await createHuntFromPrevious(h,title.trim());setExisting(await listHunts());setNotice('Uus jaht loodud eelmiste osalejatega. Positsioonid on tühjad.');}catch(e){setNotice(String(e));}finally{setWorking(false);}}

 async function openHunt(h:HuntRow){setSelected(h);setDriveId(h.hunt_drives?.slice().sort((a,b)=>a.sequence-b.sequence)[0]?.id||'');setNotice('');try{const [p,c]=await Promise.all([huntPeople(h.id),huntChoices()]);setPeople(p);setChoices(c);}catch(e){setNotice(String(e));}}
 useEffect(()=>{if(!driveId){setPositions([]);return;}let active=true;huntPositions(driveId).then(p=>{if(active)setPositions(p);}).catch(e=>{if(active)setNotice(String(e));});return()=>{active=false;};},[driveId]);
 async function addPerson(){if(!selected||!personChoice)return;const person=choices.find(c=>c.user_id===personChoice);if(!person)return;setWorking(true);try{await addHuntPerson(selected.id,person,personRole);setPeople(await huntPeople(selected.id));setPersonChoice('');setNotice('Osaleja lisatud.');}catch(e){setNotice(String(e));}finally{setWorking(false);}}
 async function placePosition(coords:[number,number]){if((!placing&&!movingId)||!driveId||!selected||working)return;setWorking(true);try{if(movingId){await moveHuntPosition(movingId,coords);setPositions(await huntPositions(driveId));setNotice('Asukoht muudetud.');setMovingId(null);return;}const number=Math.max(0,...positions.map(p=>p.number))+1;await addHuntPosition(driveId,number,coords,positionPerson||null);setPositions(await huntPositions(driveId));setNotice('Positsioon K'+number+' salvestatud.');setPlacing(false);}catch(e){setNotice(String(e));}finally{setWorking(false);}}
 async function removePerson(person:HuntPersonRow){if(!selected||!window.confirm('Eemaldada '+person.display_name+' jahist? Tema positsioonid vabastatakse.'))return;setWorking(true);try{await removeHuntPerson(person.id);setPeople(await huntPeople(selected.id));if(driveId)setPositions(await huntPositions(driveId));setNotice('Osaleja eemaldatud.');}catch(e){setNotice(String(e));}finally{setWorking(false);}}
 async function deletePosition(position:HuntPositionRow){if(!window.confirm('Kustutada see positsioon kaardilt?'))return;setWorking(true);try{await removeHuntPosition(position.id);setPositions(await huntPositions(driveId));setNotice('Positsioon kustutatud.');}catch(e){setNotice(String(e));}finally{setWorking(false);}}
 async function assign(positionId:string,personId:string){setWorking(true);try{await assignHuntPosition(positionId,personId||null);setPositions(await huntPositions(driveId));}catch(e){setNotice(String(e));}finally{setWorking(false);}}

 const [existing,setExisting]=useState<{id:string;title:string;status:string}[]>([]);
 useEffect(()=>{let active=true;listHunts().then(rows=>{if(active)setExisting(rows);}).catch(e=>{if(active)setNotice('Jahipäevade laadimine: '+e.message);});return()=>{active=false;};},[]);
 async function save(){if(!draft.title.trim()||draft.drives.some(d=>!d.title.trim())){setNotice('Sisesta jahi ja kõigi ajude nimed.');return;}setSaving(true);setNotice('');try{const id=await createHunt({title:draft.title,type:draft.type,allowSelfSelection:draft.allowSelfSelection,drives:draft.drives});setNotice('Jaht salvestatud! ID: '+id);setExisting(await listHunts());setDraft(initial);}catch(e){setNotice('Salvestamine ebaõnnestus: '+(e instanceof Error?e.message:String(e)));}finally{setSaving(false);}}

 const addDrive=()=>setDraft(h=>({...h,drives:[...h.drives,{id:crypto.randomUUID(),title:'Aju '+(h.drives.length+1),positions:0}]}));
 return <section aria-label="Jahi planeerimine">
 {selected&&<div>
 <button type="button" onClick={()=>{setSelected(null);setDriveId('');setPlacing(false);setMovingId(null);setFullMap(false);}}>← Tagasi jahipäevade juurde</button>
 <h3>{selected.title}</h3>
 <label className="field"><span>Vali aju</span><select value={driveId} onChange={e=>{setDriveId(e.target.value);setPlacing(false);setMovingId(null);}}>{selected.hunt_drives?.slice().sort((a,b)=>a.sequence-b.sequence).map(d=><option key={d.id} value={d.id}>{d.sequence}. {d.title}</option>)}</select></label>
 <h3>Jahimehed ja ajajad</h3>
 <div className="hunt-counts"><strong>Kütid {positions.filter(pos=>people.some(p=>p.id===pos.assigned_participant_id&&p.role!=='driver')).length}/{people.filter(p=>p.role!=='driver').length}</strong><strong>Ajajad {positions.filter(pos=>people.some(p=>p.id===pos.assigned_participant_id&&p.role==='driver')).length}/{people.filter(p=>p.role==='driver').length}</strong></div>
 <button type="button" onClick={()=>setRosterOpen(!rosterOpen)}>{rosterOpen?'Sulge püsiv nimekiri':'Halda püsivat nimekirja'}</button>
 {rosterOpen&&<div className="hunt-roster"><h3>Püsiv jahimeeste nimekiri</h3><input aria-label="Uue jahimehe nimi" placeholder="Ees- ja perekonnanimi" value={newName} onChange={e=>setNewName(e.target.value)}/><select value={newRole} onChange={e=>setNewRole(e.target.value as 'hunter'|'driver')}><option value="hunter">Kütt</option><option value="driver">Ajaja</option></select><button type="button" disabled={working||!newName.trim()} onClick={createRosterEntry}>+ Lisa nimekirja</button>{roster.map(p=><div className="memberrow" key={p.id}><strong>{p.display_name}</strong><select aria-label={p.display_name+' roll'} value={p.default_role} disabled={working} onChange={e=>changeRosterRole(p,e.target.value as 'hunter'|'driver')}><option value="hunter">Kütt</option><option value="driver">Ajaja</option></select><button type="button" disabled={working} onClick={()=>deleteRosterEntry(p)}>Eemalda nimekirjast</button></div>)}</div>}
 <h3>Vali aktiivsed osalejad</h3>
 {roster.map(p=><label className="checkrow" key={p.id}><span>{p.default_role==='driver'?'👣':'●'} {p.display_name}</span><input type="checkbox" disabled={working} checked={people.some(x=>x.roster_id===p.id||!!p.user_id&&x.user_id===p.user_id)} onChange={e=>toggleParticipant(p,e.target.checked)}/></label>)}

 <div className="field"><span>Lisa seltsi liige</span><select value={personChoice} onChange={e=>setPersonChoice(e.target.value)}><option value="">Vali jahimees</option>{choices.filter(c=>!people.some(p=>p.user_id===c.user_id)).map(c=><option key={c.user_id} value={c.user_id}>{c.display_name}</option>)}</select>
 <select value={personRole} onChange={e=>setPersonRole(e.target.value as 'hunter'|'driver')}><option value="hunter">Kütt</option><option value="driver">Ajaja</option></select>
 <button type="button" disabled={working||!personChoice} onClick={addPerson}>Lisa osaleja</button></div>
 {people.map(p=><div className="memberrow" key={p.id}><strong>{p.display_name}</strong><small>{p.role==='driver'?'Ajaja':p.role==='leader'?'Jahijuht':'Kütt'}</small><button type="button" disabled={working} onClick={()=>removePerson(p)}>Eemalda</button></div>)}
 <h3>Positsioonid kaardil</h3>
 <p className="muted">Vali kütt või ajaja ja vajuta „Lisa positsioon”. Seejärel puuduta kaardil asukohta. Nimed on kaardil pidevalt nähtavad. Kaardipunkt ei asenda jahiohutuse kontrolli.</p>
 <label className="field"><span>Positsioonile määratud osaleja</span><select value={positionPerson} onChange={e=>setPositionPerson(e.target.value)}><option value="">Määramata (vaba)</option>{people.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select></label>
 <button type="button" disabled={working||!driveId} onClick={()=>{setMovingId(null);setPlacing(!placing);}}>{placing?'Tühista positsiooni lisamine':'+ Lisa positsioon kaardile'}</button>
 {placing&&<p role="status">Puuduta kaardil soovitud kohta, et lisada positsioon.</p>}{movingId&&<p role="status">Asukoha muutmine: puuduta kaardil uut kohta. <button type="button" onClick={()=>setMovingId(null)}>Tühista</button></p>}
 <button type="button" onClick={()=>setFullMap(true)}>⛶ Ava suur paigutuskaart</button>
 {!fullMap&&<HuntPositionMap positions={positions} people={people} onPlace={placePosition}/>}
 {fullMap&&<div className="hunt-fullscreen"><div className="hunt-fullscreen-bar"><strong>{selected.title} · {people.length} osalejat</strong><button type="button" onClick={()=>setFullMap(false)}>Sulge suur kaart</button></div><div className="hunt-fullscreen-map"><HuntPositionMap positions={positions} people={people} onPlace={placePosition}/></div><div className="hunt-fullscreen-list"><strong>Vali paigutatav osaleja</strong>{people.map(p=><button type="button" key={p.id} onClick={()=>{setPositionPerson(p.id);setMovingId(null);setPlacing(true);}}>{p.role==='driver'?'👣':'●'} {p.display_name} {positions.some(pos=>pos.assigned_participant_id===p.id)?'✓':''}</button>)}{placing&&<span>Puuduta kaardil kohta</span>}{movingId&&<span>Puuduta kaardil uut asukohta</span>}</div></div>}
 {positions.map(p=><div className="memberrow" key={p.id}><strong>K{p.number}</strong><select aria-label={'Positsiooni '+p.number+' osaleja'} disabled={working} value={p.assigned_participant_id||''} onChange={e=>assign(p.id,e.target.value)}><option value="">Vaba</option>{people.map(person=><option key={person.id} value={person.id}>{person.display_name}</option>)}</select><button type="button" disabled={working} onClick={()=>{setPlacing(false);setMovingId(p.id);}}>Muuda asukohta</button><button type="button" disabled={working} onClick={()=>deletePosition(p)}>Kustuta punkt</button></div>)}
 {notice&&<p role="status" className="notice">{notice}</p>}
 </div>}
 {!selected&&<>
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
  <h3>Salvestatud jahid</h3>{existing.length?existing.map(h=><div className="memberrow" key={h.id}><strong>{h.title}</strong><small>{h.status}</small><button type="button" onClick={()=>openHunt(h as HuntRow)}>Ava jaht</button><button type="button" disabled={working} onClick={()=>copyPrevious(h as HuntRow)}>Uus samade osalejatega</button></div>):<p className="muted">Jahte veel ei ole.</p>}
 </>}
 </section>;
}
