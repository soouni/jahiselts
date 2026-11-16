import {useEffect,useMemo,useRef,useState} from 'react';
import {CloudSun,Info,LocateFixed,LogOut,Navigation,Ruler,Trees,Users,Wind,X} from 'lucide-react';
import {MapCanvas,type HuntMapMarker,type MapHandle} from '../Map';
import {distanceAndBearing} from '../hunt/navigation';
import {directionsUrl} from '../hunt/parking';
import {GuestError,fetchGuestSnapshot} from './api';
import {loadParnjoeForecast,nextWeatherHours,readWeatherCache,weatherDescription,type WeatherForecast} from '../weather';
import {parnjoeWindUrl,type WindReading} from '../hunt/wind';
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
 const [measuring,setMeasuring]=useState(false),[windVisible,setWindVisible]=useState(false),[weatherOpen,setWeatherOpen]=useState(false);
 const [weather,setWeather]=useState<WeatherForecast|null>(()=>readWeatherCache(localStorage)),[weatherError,setWeatherError]=useState('');
 const [windReading,setWindReading]=useState<WindReading|null>(null),[windError,setWindError]=useState('');
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
 useEffect(()=>{
  if(!windVisible)return;
  const controller=new AbortController();
  const load=async()=>{try{
   const response=await fetch(parnjoeWindUrl(),{signal:controller.signal});
   if(!response.ok)throw new Error('Tuuleandmete päring ebaõnnestus');
   const data=await response.json();
   const speed=data?.current?.wind_speed_10m,direction=data?.current?.wind_direction_10m;
   if(typeof speed!=='number'||typeof direction!=='number')throw new Error('Tuuleandmed puuduvad');
   setWindReading({speed,direction,time:String(data.current.time||''),fetchedAt:Date.now()});setWindError('');
  }catch(e){if(!controller.signal.aborted)setWindError(e instanceof Error?e.message:String(e));}};
  void load();const timer=window.setInterval(()=>void load(),10*60*1000);
  return()=>{controller.abort();clearInterval(timer);};
 },[windVisible]);
 useEffect(()=>{
  if(!weatherOpen)return;
  const controller=new AbortController();
  void loadParnjoeForecast(controller.signal,localStorage).then(value=>{setWeather(value);setWeatherError('');}).catch(e=>{if(!controller.signal.aborted)setWeatherError(e instanceof Error?e.message:String(e));});
  return()=>controller.abort();
 },[weatherOpen]);
 const mine=useMemo(()=>snapshot.positions.find(p=>p.id===myId)||null,[snapshot,myId]);
 const selected=snapshot.positions.find(p=>p.id===selectedId)||null;
 const markers:HuntMapMarker[]=useMemo(()=>snapshot.positions.filter(p=>p.role==='hunter').map(p=>({id:p.id,name:p.name,role:p.role,coordinates:p.coordinates,positionNumber:p.number,isMine:p.id===myId})),[snapshot,myId]);
 useEffect(()=>{if(fitted.current||!markers.length)return;const t=setTimeout(()=>{map.current?.fitHunt();fitted.current=true;},400);return()=>clearTimeout(t);},[markers.length]);
 const toMine=mine&&fix?distanceAndBearing(fix.coords,mine.coordinates):null;
 /** Lähimad naabrid linnulennult, et näha, kes on kõrval. */
 const neighbours=useMemo(()=>mine?.role==='hunter'?snapshot.positions.filter(p=>p.id!==mine.id&&p.role==='hunter').map(p=>({position:p,meters:distanceAndBearing(mine.coordinates,p.coordinates)?.meters??Infinity})).sort((a,b)=>a.meters-b.meters).slice(0,2):[],[snapshot,mine]);
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
  <MapCanvas ref={map} huntDriveArea={snapshot.drive?.area||null} huntMarkers={markers} wind={windVisible?{reading:windReading,error:windError,now:Date.now()}:undefined} huntDistanceOn={false} huntMode huntMoving={false} huntCanDrag={false} onHuntDrag={noop} onHuntSelect={id=>{setListOpen(false);setSelectedId(id);}} onHuntPlace={noop} measuring={measuring} onCloseMeasure={()=>setMeasuring(false)} searchResult={null} onClearSearch={noop} entries={[]} base={base} boundaryVisible drawing={null} drawingColor="#173e32" drawingWidth={3} drawType="Point" editGeometry={null} onGeometry={noop} onSelect={noop} onReady={noop} onError={setToast}/>
  <header className="topbar"><div className="brand guest-brand"><div className="brandicon"><Trees size={26}/></div><div><strong>Pärnjõe</strong><span>JAHIVAADE</span></div></div><div className="topactions"><button className="login" onClick={()=>{if(window.confirm('Sulgeda jahivaade? Uuesti avamiseks on vaja jahikoodi.'))onExit();}}><LogOut size={17}/><span>Välju</span></button></div></header>
  <div className="hunt-statusbar"><span className={`connection-dot ${online&&!stale?'is-online':'is-offline'}`}/><strong>{title}</strong><span>{online&&!stale?'Ainult vaatamine':'Salvestatud vaade · '+new Date(syncedAt).toLocaleTimeString('et-EE',{hour:'2-digit',minute:'2-digit'})}</span></div>
  <div className="basemap basemap-cycle"><button type="button" className="basemap-cycle-button" aria-label={`Aluskaart: ${baseName}. Vajuta kaardi vahetamiseks.`} title={`Aluskaart: ${baseName}`} onClick={()=>setBase(current=>current==='kaart'?'foto':current==='foto'?'hybriid':'kaart')}><svg className="basemap-layer-svg" viewBox="0 0 48 48" aria-hidden="true" fill="none"><path d="M24 6 42 21 24 35 6 21 24 6Z" fill="currentColor"/><path d="M7 29 24 42 41 29" stroke="currentColor" strokeWidth="5" strokeLinecap="square" strokeLinejoin="miter"/></svg><span className="tool-caption">{baseName}</span></button></div>
  <div className="guest-extra-tools" style={{position:'absolute',left:12,top:240,zIndex:12,display:'flex',flexDirection:'column',gap:8}}>
   <button type="button" aria-pressed={windVisible} onClick={()=>setWindVisible(v=>!v)} style={{borderRadius:12,padding:'10px 12px',background:windVisible?'#d6eddf':'white',color:'#173e32',display:'flex',gap:8,alignItems:'center'}}><Wind size={19}/>Tuul</button>
   <button type="button" aria-pressed={measuring} onClick={()=>setMeasuring(v=>!v)} style={{borderRadius:12,padding:'10px 12px',background:measuring?'#d6eddf':'white',color:'#173e32',display:'flex',gap:8,alignItems:'center'}}><Ruler size={19}/>Vahemaad</button>
   <button type="button" aria-expanded={weatherOpen} onClick={()=>setWeatherOpen(v=>!v)} style={{borderRadius:12,padding:'10px 12px',background:weatherOpen?'#d6eddf':'white',color:'#173e32',display:'flex',gap:8,alignItems:'center'}}><CloudSun size={19}/>Ilmateade</button>
  </div>
  {windVisible&&windReading&&<div role="status" style={{position:'absolute',top:205,left:12,zIndex:12,background:'white',borderRadius:8,padding:'5px 8px',fontSize:12}}>Tuul {windReading.speed.toFixed(1)} m/s · {Math.round(windReading.direction)}°</div>}
  {windVisible&&windError&&<div role="alert" className="toast">{windError}</div>}
  {weatherOpen&&<section aria-label="Pärnjõe ilmateade" style={{position:'absolute',zIndex:16,left:12,right:12,bottom:130,background:'white',borderRadius:16,padding:16,maxHeight:'50vh',overflowY:'auto',boxShadow:'0 4px 22px #0003'}}>
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><strong>Pärnjõe ilmateade</strong><button type="button" aria-label="Sulge ilmateade" onClick={()=>setWeatherOpen(false)}><X size={20}/></button></div>
   <p className="muted">Open-Meteo prognoos · Pärnjõe piirkond</p>
   {weatherError&&<p role="alert">{weatherError}</p>}
   {nextWeatherHours(weather,Date.now()).map(h=><div key={h.time} style={{display:'flex',justifyContent:'space-between',gap:10,padding:'8px 0',borderBottom:'1px solid #ddd'}}><strong>{new Date(h.time*1000).toLocaleTimeString('et-EE',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Tallinn'})}</strong><span>{h.temperature===null?'–':Math.round(h.temperature)+' °C'}</span><span>{h.wind===null?'–':h.wind.toFixed(1)+' m/s'}</span><span>{weatherDescription(h.code)}</span></div>)}
   {!weather&&!weatherError&&<p>Laadin ilmateadet…</p>}
  </section>}
  <button type="button" className={`hunt-gps-toggle${gpsOn?' is-active':''}`} aria-pressed={gpsOn} title="Näita minu asukohta" aria-label="Näita minu asukohta kaardil" onClick={toggleGps}><LocateFixed size={22}/><span>GPS</span></button>
  {(selected||listOpen)&&<section className="hunt-sheet guest-sheet" aria-label={selected?'Valitud jahikoht':'Jahi paigutus'}>
   <button type="button" className="iconbtn guest-sheet-close" aria-label="Sulge" onClick={()=>{setSelectedId(null);setListOpen(false);}}><X size={20}/></button>
   {selected?<>
    <h2>K{selected.number} · {selected.name}</h2><p className="muted">{roleLabel(selected.role)}{selected.id===myId?' · sinu koht':''}</p>
    {selected.id===myId?<button type="button" onClick={()=>{setMyId(null);setSelectedId(null);}}>See ei ole minu koht</button>:<button type="button" className="primary full" onClick={()=>{setMyId(selected.id);setSelectedId(null);}}>See olen mina</button>}
   </>:<>
    <h2>{snapshot.positions.length?'Vali oma nimi':'Paigutus puudub'}</h2>
    {!snapshot.positions.length&&<p className="muted">Jahijuht ei ole selles ajus veel kedagi kaardile paigutanud. Vaade uueneb ise.</p>}
    <div className="guest-list">{snapshot.positions.map(p=><button type="button" key={p.id} className="guest-placed-person" style={{background:p.id===myId?'#d1eadb':'#eaf7ee',borderColor:p.id===myId?'#31835e':'#b9ddc5'}} aria-pressed={p.id===myId} onClick={()=>{setMyId(p.id);setListOpen(false);}}><strong>K{p.number}</strong><span>{p.name}</span><small style={{display:'flex',alignItems:'center',gap:6}}><span aria-hidden="true" style={{color:'#247b4d',fontWeight:800}}>✓</span>{p.id===myId?'Minu koht':'Paigutatud'}</small></button>)}</div>
   </>}
  </section>}
  <nav className="bottomnav hunt-dock guest-dock" aria-label="Jahivaate tööriistad">
   <button aria-pressed={listOpen} onClick={()=>{setSelectedId(null);setListOpen(v=>!v);}}><Users/><span>Paigutus</span></button>
   <button className="add" onClick={()=>{setSelectedId(null);setListOpen(false);map.current?.fitHunt();}}><Navigation/><span>{mine?'K'+mine.number:'Minu koht'}</span><small>{toMine?meters(toMine.meters):mine?'Vaata kaardil':'Vali nimi'}</small></button>
  </nav>
  {mine&&!selected&&!listOpen&&<aside className="guest-mine" aria-label="Minu jahikoht">
   <strong>Sinu koht: K{mine.number}</strong>
   {mine.role!=='hunter'&&<span>{roleLabel(mine.role)} · Kütiliini naabreid ei kuvata</span>}
   {toMine&&<span>Kohani {meters(toMine.meters)} · {Math.round(toMine.bearing)}° põhjast</span>}
   {mine.role==='hunter'&&neighbours.length>0&&<span>Kõrval: {neighbours.map(n=>n.position.name+' (K'+n.position.number+', '+meters(n.meters)+')').join(' ja ')}</span>}
   <span className="guest-mine-links">{driving&&<a href={driving} target="_blank" rel="noopener noreferrer">Autoga lähemale ↗</a>}{walking&&<a href={walking} target="_blank" rel="noopener noreferrer">Jalgsi ↗</a>}</span>
  </aside>}
  {gpsError&&<div className="guest-gps-error" role="alert">{gpsError}</div>}
  <footer className="attribution"><a href="https://geoportaal.maaruum.ee/avaandmete-litsents" target="_blank" rel="noreferrer">{base==='kaart'?'Aluskaart':'Ortofoto'}: Maa- ja Ruumiamet</a><br/><a href="https://metadata.geoportaal.ee/geonetwork/srv/api/records/608db693-7eb4-40f0-a1c5-c54e3f109790" target="_blank" rel="noreferrer">Piir: EELIS, Keskkonnaagentuur · CC BY 4.0</a><br/><span>Kaardipunkt ei asenda jahijuhi ohutuskorraldusi.</span></footer>
  {toast&&<div role="status" className="toast"><Info size={18}/><span>{toast}</span><button onClick={()=>setToast('')} aria-label="Sulge teade"><X size={17}/></button></div>}
 </main>;
}
