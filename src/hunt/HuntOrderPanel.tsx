import {useMemo,useState} from 'react';
import type {HuntPersonRow,HuntPositionRow} from './api';
import {confirmHuntPositionOrder} from './api';

type Props={driveId:string;positions:HuntPositionRow[];people:HuntPersonRow[];disabled:boolean;onSaved:()=>Promise<void>};
type Candidate={id:string;name:string;oldNumber:number;x:number;y:number};
/** The principal axis is only a suggested order; the hunt leader must verify the line direction. */
function geographicOrder(items:Candidate[]):Candidate[]{
 const n=items.length;if(n<2)return items;
 const mx=items.reduce((s,p)=>s+p.x,0)/n,my=items.reduce((s,p)=>s+p.y,0)/n;
 const xx=items.reduce((s,p)=>s+(p.x-mx)**2,0),yy=items.reduce((s,p)=>s+(p.y-my)**2,0);
 const xy=items.reduce((s,p)=>s+(p.x-mx)*(p.y-my),0);
 const angle=Math.atan2(2*xy,xx-yy)/2;
 let dx=Math.cos(angle),dy=Math.sin(angle);
 // Default: west to east for an E-W line, north to south for an N-S line.
 if(Math.abs(dx)>=Math.abs(dy)?dx<0:dy>0){dx=-dx;dy=-dy;}
 return [...items].sort((a,b)=>((a.x-mx)*dx+(a.y-my)*dy)-((b.x-mx)*dx+(b.y-my)*dy)||a.oldNumber-b.oldNumber);
}
export function HuntOrderPanel({driveId,positions,people,disabled,onSaved}:Props){
 const [preview,setPreview]=useState<string[]|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const candidates=useMemo(()=>{
  const byId=new Map(people.map(p=>[p.id,p]));
  return positions.flatMap(p=>{
   const person=p.assigned_participant_id?byId.get(p.assigned_participant_id):null;
   if(!person||person.role!=='hunter')return [];
   const [lon,lat]=p.location.coordinates;
   if(!Number.isFinite(lon)||!Number.isFinite(lat))return [];
   return [{id:p.id,name:person.display_name,oldNumber:p.number,x:lon*Math.cos(lat*Math.PI/180),y:lat}];
  });
 },[positions,people]);
 const byId=new Map(candidates.map(p=>[p.id,p]));
 const valid=preview!==null&&preview.length===candidates.length&&preview.every(id=>byId.has(id));
 function move(index:number,step:number){if(!preview)return;const next=[...preview],target=index+step;if(target<0||target>=next.length)return;[next[index],next[target]]=[next[target],next[index]];setPreview(next);}
 async function confirm(){if(!valid||busy||disabled)return;
  if(!window.confirm('Kinnitada küttide uus järjestus? Kõikide selle aju kohtade numbrid muutuvad ja külalisvaade uueneb.'))return;
  setBusy(true);setError('');
  try{await confirmHuntPositionOrder(driveId,preview!);await onSaved();setPreview(null);}
  catch(e){setError('Kinnitamine ebaõnnestus: '+(e instanceof Error?e.message:String(e)));}
  finally{setBusy(false);}
 }
 return <section className="hunt-roster" aria-label="Küttide paigutuse kinnitamine">
  <h3>Küttide järjestus</h3>
  <p className="muted">Kui kõik kütid on paigutatud, koosta geograafiline eelvaade. Kontrolli kütiliini suunda ja muuda järjestust vajadusel. Ajajad ning koerajuhid ei kuulu kütiliini.</p>
  <button type="button" disabled={disabled||busy||candidates.length<2} onClick={()=>{setPreview(geographicOrder(candidates).map(p=>p.id));setError('');}}>Kõik paigutatud – järjestuse eelvaade</button>
  {preview&&<div>
   <p className="muted">Eelvaade (ei ole veel salvestatud). Keeruka või kõvera kütiliini puhul paranda järjestust käsitsi.</p>
   <button type="button" disabled={busy} onClick={()=>setPreview([...preview].reverse())}>Pööra järjestus ümber</button>
   <ol>{preview.map((id,i)=>{const p=byId.get(id);return <li key={id} className="memberrow"><strong>K{i+1}</strong><span>{p?.name||'Puudub'} <small>(praegu K{p?.oldNumber})</small></span><button type="button" aria-label={'Liiguta '+p?.name+' üles'} disabled={busy||i===0} onClick={()=>move(i,-1)}>↑</button><button type="button" aria-label={'Liiguta '+p?.name+' alla'} disabled={busy||i===preview.length-1} onClick={()=>move(i,1)}>↓</button></li>;})}</ol>
   <p className="muted">Kinnitamisel nummerdatakse ka ülejäänud positsioonid küttidest edasi. Asukohti ei muudeta.</p>
   <button type="button" className="primary" disabled={!valid||busy||disabled} onClick={()=>void confirm()}>{busy?'Salvestan…':'Kinnita küttide järjestus'}</button>
   <button type="button" disabled={busy} onClick={()=>setPreview(null)}>Tühista eelvaade</button>
  </div>}
  {error&&<p role="alert" className="notice">{error}</p>}
 </section>;
}
