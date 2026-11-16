import {useEffect,useMemo,useRef,useState} from 'react';
import {Info,LocateFixed,LogOut,Navigation,Trees,Users,X} from 'lucide-react';
import {MapCanvas,type HuntMapMarker,type MapHandle} from '../Map';
import {distanceAndBearing} from '../hunt/navigation';
import {directionsUrl} from '../hunt/parking';
import {GuestError,fetchGuestSnapshot} from './api';
import {guestProblem,roleLabel,saveGuestSession,type GuestSnapshot} from './session';

const REFRESH_MS=20000;
const noop=()=>{};
type Props={token:string;initial:GuestSnapshot;initialPositionId:string|null;onExit:(notice?:string)=>void};
/** Jahikoodiga külalise vaade: ainult vaatamine. Siit ei tehta ühtki andmebaasi kirjutust ega jagata asukohta. */
export function GuestHunt({token,initial,initialPositionId,onExit}:Props){
 const map=useRef<MapHandle>(null);
 const [snapshot,setSnapshot]=useState(initial),[myId,setMyId]=useState<string|null>(initialPositionId);
 const [base,setBase]=useState('hybriid'),[listOpen,setListOpen]=useState(!initialPositionId),[selectedId,setSelectedId]=useState<string|null>(null);
 const [online,setOnline]=useState(navigator.onLine),[syncedAt,setSyncedAt]=useState(Date.now()),[stale,setStale]=useState(false),[toast,setToast]=useState('');
 const [fix,setFix]=useState<{coords:[number,number];accuracy:number}|null>(null),[gpsError,setGpsError]=useState(''),[gpsOn,setGpsOn]=useState(false);
 const watch=useRef<number|null>(null),fitted=useRef(false);
 useEffect(()=>{saveGuestSession(localStorage,{token,snapshot,savedAt:syncedAt,myPositionId:myId});},[token,snapshot,syncedAt,myId]);
 useEffect(()=>{
  let alive=true;
  const refresh=async()=>{
   if(document.visibilityState!=='visible'||!navigator.onLine)return;
   try{const fresh=await fetchGuestSnapshot(token);if(!alive)return;setSnapshot(fresh);setSyncedAt(Date.now());setStale(false);}
   catch(e){if(!alive)return;if(e instanceof GuestError&&e.code==='guest_expired'){onExit(guestProblem('guest_expired'));return;}setStale(true);}
  };
  void refresh();
  const timer=window.setInterval(()=>void refresh(),REFRESH_MS);
  const wake=()=>{setOnline(navigator.onLine);void refresh();};
  window.addEventListener('online',wake);window.addEventListener('offline',wake);window.addEventListener('focus',wake);document.addEventListener('visibilitychange',wake);
  return()=>{alive=false;clearInterval(timer);window.removeEventListener('online',wake);window.removeEventListener('offline',wake);window.removeEventListener('focus',wake);document.removeEventListener('visibilitychange',wake);};
 },[token]);
 useEffect(()=>()=>{if(watch.current!==null)navigator.geolocation.clearWatch(watch.current);},[]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),7000);return()=>clearTimeout(t);},[toast]);
 const mine=useMemo(()=>snapshot.positions.find(p=>p.id===myId)||null,[snapshot,myId]);
 const selected=snapshot.positions.find(p=>p.id===selectedId)||null;
 const markers:HuntMapMarker[]=useMemo(()=>snapshot.positions.map(p=>({id:p.id,name:p.name,role:p.role,coordinates:p.coordinates,positionNumber:p.number,isMine:p.id===myId})),[snapshot,myId]);
 useEffect(()=>{if(fitted.current||!markers.length)return;const t=setTimeout(()=>{map.current?.fitHunt();fitted.current=true;},400);return()=>clearTimeout(t);},[markers.length]);
 const toMine=mine&&fix?distanceAndBearing(fix.coords,mine.coordinates):null;
 /** Lähimad naabrid linnulennult, et näha, kes on kõrval. */
 const neighbours=useMemo(()=>mine?snapshot.positions.filter(p=>p.id!==mine.id).map(p=>({position:p,meters:distanceAndBearing(mine.coordinates,p.coordinates)?.meters??Infinity})).sort((a,b)=>a.meters-b.meters).slice(0,2):[],[snapshot,mine]);
 function toggleGps(){
  if(watch.current!==null){navigator.geolocation.clearWatch(watch.current);watch.current=null;setGpsOn(false);setFix(null);map.current?.clearGps();return;}
  if(!navigator.geolocation){setGpsError('See brauser ei toeta GPS-asukohta.');return;}
  setGpsError('');setGpsOn(true);let first=true;
  watch.current=navigator.geolocation.watchPosition(position=>{
   const coords:[number,number]=[position.coords.longitude,position.coords.latitude];
   setFix({coords,accuracy:position.coords.accuracy});
   if(first){first=false;map.current?.locate(coords,position.coords.accuracy);}else map.current?.showGps(coords,position.coords.accuracy);
  },error=>{setGpsError(error.code===1?'Asukohaluba on keelatud. Luba brauserile asukoha kasutamine.':'GPS-asukohta ei saanud määrata.');if(watch.current!==null)navigator.geolocation.clearWatch(watch.current);watch.current=null;setGpsOn(false);setFix(null);},{enableHighAccuracy:true,maximumAge:5000,timeout:20000});
 }
 const meters=(value:number)=>value<1000?Math.round(value)+' m':(value/1000).toFixed(1)+' km';
 const baseName=base==='kaart'?'Kaart':base==='foto'?'Ortofoto':'Hübriid';
 const title=snapshot.hunt.title+(snapshot.drive?' · '+snapshot.drive.sequence+'. '+snapshot.drive.title:'');
 const walking=mine?directionsUrl(mine.coordinates,'walking'):null,driving=mine?directionsUrl(mine.coordinates,'driving'):null;
 return <main className="hunt-active guest-hunt">
  <MapCanvas ref={map} huntDriveArea={snapshot.drive?.area||null} huntMarkers={markers} huntDistanceOn={false} huntMode huntMoving={false} huntCanDrag={false} onHuntDrag={noop} onHuntSelect={id=>{setListOpen(false);setSelectedId(id);}} onHuntPlace={noop} measuring={false} onCloseMeasure={noop} searchResult={null} onClearSearch={noop} entries={[]} base={base} boundaryVisible drawing={null} drawingColor="#173e32" drawingWidth={3} drawType="Point" editGeometry={null} onGeometry={noop} onSelect={noop} onReady={noop} onError={setToast}/>
  <header className="topbar"><div className="brand guest-brand"><div className="brandicon"><Trees size={26}/></div><div><strong>Pärnjõe</strong><span>JAHIVAADE</span></div></div><div className="topactions"><button className="login" onClick={()=>{if(window.confirm('Sulgeda jahivaade? Uuesti avamiseks on vaja jahikoodi.'))onExit();}}><LogOut size={17}/><span>Välju</span></button></div></header>
  <div className="hunt-statusbar"><span className={`connection-dot ${online&&!stale?'is-online':'is-offline'}`}/><strong>{title}</strong><span>{online&&!stale?'Ainult vaatamine':'Salvestatud vaade · '+new Date(syncedAt).toLocaleTimeString('et-EE',{hour:'2-digit',minute:'2-digit'})}</span></div>
  <div className="basemap basemap-cycle"><button type="button" className="basemap-cycle-button" aria-label={`Aluskaart: ${baseName}. Vajuta kaardi vahetamiseks.`} title={`Aluskaart: ${baseName}`} onClick={()=>setBase(current=>current==='kaart'?'foto':current==='foto'?'hybriid':'kaart')}><svg className="basemap-layer-svg" viewBox="0 0 48 48" aria-hidden="true" fill="none"><path d="M24 6 42 21 24 35 6 21 24 6Z" fill="currentColor"/><path d="M7 29 24 42 41 29" stroke="currentColor" strokeWidth="5" strokeLinecap="square" strokeLinejoin="miter"/></svg><span className="tool-caption">{baseName}</span></button></div>
  <button type="button" className={`hunt-gps-toggle${gpsOn?' is-active':''}`} aria-pressed={gpsOn} title="Näita minu asukohta" aria-label="Näita minu asukohta kaardil" onClick={toggleGps}><LocateFixed size={22}/><span>GPS</span></button>
  {(selected||listOpen)&&<section className="hunt-sheet guest-sheet" aria-label={selected?'Valitud jahikoht':'Jahi paigutus'}>
   <button type="button" className="iconbtn guest-sheet-close" aria-label="Sulge" onClick={()=>{setSelectedId(null);setListOpen(false);}}><X size={20}/></button>
   {selected?<>
    <h2>K{selected.number} · {selected.name}</h2><p className="muted">{roleLabel(selected.role)}{selected.id===myId?' · sinu koht':''}</p>
    {selected.id===myId?<button type="button" onClick={()=>{setMyId(null);setSelectedId(null);}}>See ei ole minu koht</button>:<button type="button" className="primary full" onClick={()=>{setMyId(selected.id);setSelectedId(null);}}>See olen mina</button>}
   </>:<>
    <h2>{snapshot.positions.length?'Vali oma nimi':'Paigutus puudub'}</h2>
    {!snapshot.positions.length&&<p className="muted">Jahijuht ei ole selles ajus veel kedagi kaardile paigutanud. Vaade uueneb ise.</p>}
    <div className="guest-list">{snapshot.positions.map(p=><button type="button" key={p.id} aria-pressed={p.id===myId} onClick={()=>{setMyId(p.id);setListOpen(false);}}><strong>K{p.number}</strong><span>{p.name}</span><small>{roleLabel(p.role)}</small></button>)}</div>
   </>}
  </section>}
  <nav className="bottomnav hunt-dock guest-dock" aria-label="Jahivaate tööriistad">
   <button aria-pressed={listOpen} onClick={()=>{setSelectedId(null);setListOpen(v=>!v);}}><Users/><span>Paigutus</span></button>
   <button className="add" onClick={()=>{setSelectedId(null);setListOpen(false);map.current?.fitHunt();}}><Navigation/><span>{mine?'K'+mine.number:'Minu koht'}</span><small>{toMine?meters(toMine.meters):mine?'Vaata kaardil':'Vali nimi'}</small></button>
  </nav>
  {mine&&!selected&&!listOpen&&<aside className="guest-mine" aria-label="Minu jahikoht">
   <strong>Sinu koht: K{mine.number}</strong>
   {toMine&&<span>Kohani {meters(toMine.meters)} · {Math.round(toMine.bearing)}° põhjast</span>}
   {neighbours.length>0&&<span>Kõrval: {neighbours.map(n=>n.position.name+' (K'+n.position.number+', '+meters(n.meters)+')').join(' ja ')}</span>}
   <span className="guest-mine-links">{driving&&<a href={driving} target="_blank" rel="noopener noreferrer">Autoga lähemale ↗</a>}{walking&&<a href={walking} target="_blank" rel="noopener noreferrer">Jalgsi ↗</a>}</span>
  </aside>}
  {gpsError&&<div className="guest-gps-error" role="alert">{gpsError}</div>}
  <footer className="attribution"><a href="https://geoportaal.maaruum.ee/avaandmete-litsents" target="_blank" rel="noreferrer">{base==='kaart'?'Aluskaart':'Ortofoto'}: Maa- ja Ruumiamet</a><br/><a href="https://metadata.geoportaal.ee/geonetwork/srv/api/records/608db693-7eb4-40f0-a1c5-c54e3f109790" target="_blank" rel="noreferrer">Piir: EELIS, Keskkonnaagentuur · CC BY 4.0</a><br/><span>Kaardipunkt ei asenda jahijuhi ohutuskorraldusi.</span></footer>
  {toast&&<div role="status" className="toast"><Info size={18}/><span>{toast}</span><button onClick={()=>setToast('')} aria-label="Sulge teade"><X size={17}/></button></div>}
 </main>;
}
