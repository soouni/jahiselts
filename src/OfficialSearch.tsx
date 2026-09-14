import {useEffect,useState} from 'react';
import {ChevronRight,LoaderCircle,MapPin,Search} from 'lucide-react';
import {gazetteerSource,searchOfficialPlaces,type OfficialPlace} from './officialSearch';

export function OfficialSearch({query,onSelect}:{query:string;onSelect:(place:OfficialPlace)=>void}){
 const [region,setRegion]=useState<'637'|'all'>('637'),[retry,setRetry]=useState(0);
 const [result,setResult]=useState<{key:string;status:'loading'|'done'|'error';places:OfficialPlace[]}>({key:'',status:'loading',places:[]});
 const text=query.trim(),key=region+'|'+text;
 useEffect(()=>{
  if(text.length<3)return;
  const controller=new AbortController();
  setResult({key,status:'loading',places:[]});
  const timer=setTimeout(()=>{
   searchOfficialPlaces(text,region,controller.signal).then(places=>{
    if(!controller.signal.aborted)setResult({key,status:'done',places});
   }).catch(()=>{if(!controller.signal.aborted)setResult({key,status:'error',places:[]});});
  },650);
  return()=>{clearTimeout(timer);controller.abort();};
 },[text,region,key,retry]);
 const current=result.key===key?result:{key,status:'loading' as const,places:[]};
 return <div className="official-search">
  <label className="search-region"><span>Piirkond</span><select value={region} onChange={e=>setRegion(e.target.value as '637'|'all')}><option value="637">Põhja-Pärnumaa</option><option value="all">Kogu Eesti</option></select></label>
  {text.length<3?<div className="empty"><Search/><strong>Otsi kohanime, jõge või teed</strong><p>Sisesta vähemalt 3 tähte.<br/>Näiteks Pärnjõe tee või Vändra jõgi.</p></div>:<>
   {current.status==='loading'&&<p className="search-status" role="status"><LoaderCircle className="spin" size={20}/> Otsin kohanimesid…</p>}
   {current.status==='error'&&<div className="notice" role="alert"><p>Kohanimeotsing ei vasta. Kontrolli internetiühendust ja proovi uuesti.</p><button onClick={()=>setRetry(v=>v+1)}>Proovi uuesti</button></div>}
   {current.status==='done'&&<p className="search-status muted" role="status">{current.places.length?current.places.length+' otsingutulemust':'Selle nimega kohta ei leitud.'}</p>}
   {current.status==='done'&&!current.places.length&&<p className="muted">Proovi lühemat nime{region==='637'?' või vali piirkonnaks kogu Eesti':''}.</p>}
   {current.places.map(place=><button key={place.id} className="menurow official-result" onClick={()=>onSelect(place)}><MapPin/><span><strong>{place.name}</strong><small>{place.type} · {place.detail}</small></span><ChevronRight/></button>)}
  </>}
  <p className="search-source">Allikas: <a href={gazetteerSource} target="_blank" rel="noreferrer">Maa- ja Ruumiameti kohanime- ja aadressiotsing</a></p>
 </div>;
}
