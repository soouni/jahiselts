import {useEffect,useMemo,useRef,useState} from 'react';
import {CloudSun,Download,Flag,Info,LocateFixed,LogOut,Navigation,Ruler,Trees,Users,Wind,X} from 'lucide-react';
import {MapCanvas,type HuntMapMarker,type MapHandle} from '../Map';
import {distanceAndBearing} from '../hunt/navigation';
import {directionsUrl} from '../hunt/parking';
import {GuestError,fetchGuestSnapshot} from './api';
import {loadParnjoeForecast,nextWeatherHours,readWeatherCache,weatherDescription,type WeatherForecast} from '../weather';
import {parnjoeWindUrl,type WindReading} from '../hunt/wind';
import {guestProblem,isDriver,meetingTime,roleLabel,saveGuestSession,type GuestSnapshot} from './session';

const REFRESH_MS=20000;
const MEETING_ID='meeting';
// Kaardi sobitamisel jäetakse ruumi päisele, tööriistadele (vasakul), GPS-nupule (paremal) ja alumisele kastile, et ükski koht ei jääks nende alla.
const FIT_PADDING:[number,number,number,number]=[250,120,330,100];
const noop=()=>{};
type Sheet='list'|'meeting'|'weather'|null;
type OfflineState={completed:number;failed:number;total:number;done:boolean}|null;
type Props={token:string;initial:GuestSnapshot;initialPositionId:string|null;onExit:(notice?:string)=>void};
/** Jahikoodiga külalise vaade: ainult vaatamine. Siit ei tehta ühtki andmebaasi kirjutust ega jagata asukohta. */
export function GuestHunt({token,initial,initialPositionId,onExit}:Props){
 const map=useRef<MapHandle>(null);
 const [snapshot,setSnapshot]=useState(initial),[myId,setMyId]=useState<string|null>(initialPositionId);
 const [base,setBase]=useState('hybriid'),[sheet,setSheet]=useState<Sheet>(initialPositionId?null:'list'),[selectedId,setSelectedId]=useState<string|null>(null);
 const [online,setOnline]=useState(navigator.onLine),[syncedAt,setSyncedAt]=useState(Date.now()),[stale,setStale]=useState(false),[toast,setToast]=useState('');
 const [measuring,setMeasuring]=useState(false),[windVisible,setWindVisible]=useState(false);
 const [weather,setWeather]=useState<WeatherForecast|null>(()=>readWeatherCache(localStorage)),[weatherError,setWeatherError]=useState('');
 const [windReading,setWindReading]=useState<WindReading|null>(null),[windError,setWindError]=useState('');
 const [fix,setFix]=useState<{coords:[number,number];accuracy:number}|null>(null),[gpsError,setGpsError]=useState(''),[gpsOn,setGpsOn]=useState(false);
 const [offline,setOffline]=useState<OfflineState>(null);
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
   if(!response.ok)throw new Error();
   const data=await response.json();
   const speed=data?.current?.wind_speed_10m,direction=data?.current?.wind_direction_10m;
   if(typeof speed!=='number'||typeof direction!=='number')throw new Error();
   setWindReading({speed,direction,time:String(data.current.time||''),fetchedAt:Date.now()});setWindError('');
  }catch{if(!controller.signal.aborted){setWindError('Tuuleandmeid ei saanud laadida.');setToast('Tuuleandmeid ei saanud laadida. Kontrolli võrku.');}}};
  void load();const timer=window.setInterval(()=>void load(),10*60*1000);
  return()=>{controller.abort();clearInterval(timer);};
 },[windVisible]);
 useEffect(()=>{
  if(sheet!=='weather')return;
  const controller=new AbortController();
  void loadParnjoeForecast(controller.signal,localStorage).then(value=>{setWeather(value);setWeatherError('');}).catch(()=>{if(!controller.signal.aborted)setWeatherError('Ilmateadet ei saanud laadida. Kontrolli võrku.');});
  return()=>controller.abort();
 },[sheet]);
 // Võrguta kaardi salvestamise edenemine tuleb teenusetöötajalt (offline-sw.js).
 useEffect(()=>{
  const worker=navigator.serviceWorker;if(!worker)return;
  const handle=(event:MessageEvent)=>{
   const data=event.data;if(!data||typeof data.type!=='string')return;
   if(data.type==='OFFLINE_MAP_PROGRESS')setOffline({completed:Number(data.completed)||0,failed:Number(data.failed)||0,total:Number(data.total)||0,done:false});
   if(data.type==='OFFLINE_MAP_READY'){const m=data.metadata||{};setOffline({completed:Number(m.completed)||0,failed:Number(m.failed)||0,total:Number(m.total)||0,done:true});setToast(Number(m.failed)>0?'Kaart salvestati osaliselt: '+m.failed+' kaardipaani jäi laadimata.':'Kaart on salvestatud. Aju ala kaart töötab nüüd ka ilma levita.');}
   if(data.type==='OFFLINE_MAP_ERROR'){setOffline(null);setToast('Kaardi salvestamine ebaõnnestus. Proovi uuesti, kui võrk on parem.');}
  };
  worker.addEventListener('message',handle);return()=>worker.removeEventListener('message',handle);
 },[]);
 const mine=useMemo(()=>snapshot.positions.find(p=>p.id===myId)||null,[snapshot,myId]);
 const selected=snapshot.positions.find(p=>p.id===selectedId)||null;
 const meeting=snapshot.meeting;
 const meetingClock=meeting?.at?new Date(meeting.at).toLocaleTimeString('et-EE',{timeZone:'Europe/Tallinn',hour:'2-digit',minute:'2-digit'}):'';
 // Kaardil on kõik paigutatud inimesed: küttide kohad ja ajajate sisenemiskohad (ajajad teise värviga) ning kogunemiskoht.
 const markers:HuntMapMarker[]=useMemo(()=>[
  ...snapshot.positions.map(p=>({id:p.id,name:p.name,role:p.role,coordinates:p.coordinates,positionNumber:p.number,isMine:p.id===myId})),
  ...(meeting?.coordinates?[{id:MEETING_ID,name:'Kogunemine'+(meetingClock?' '+meetingClock:''),role:'meeting',coordinates:meeting.coordinates}]:[])
 ],[snapshot,myId,meetingClock]);
 useEffect(()=>{if(fitted.current||!markers.length)return;const t=setTimeout(()=>{map.current?.fitHunt(FIT_PADDING);fitted.current=true;},400);return()=>clearTimeout(t);},[markers.length]);
 const toMine=mine&&fix?distanceAndBearing(fix.coords,mine.coordinates):null;
 const toMeeting=meeting?.coordinates&&fix?distanceAndBearing(fix.coords,meeting.coordinates):null;
 /** Kütiliini lähimad naabrid linnulennult. Ajajad liiguvad, seetõttu neid naabriks ei loeta. */
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
 /** Salvestab aju ala (või selle puudumisel jahipiirkonna) aluskaardi ja rakenduse failid telefoni. Käivitub ainult nupust, et mobiilset andmemahtu ei kulutataks küsimata. */
 function saveOfflineMap(){
  const controller=navigator.serviceWorker?.controller;
  if(!controller){setToast('Võrguta kaart ei ole selles brauseris veel valmis. Laadi leht uuesti ja proovi siis.');return;}
  if(!navigator.onLine){setToast('Kaardi salvestamiseks on vaja võrguühendust.');return;}
  const urls=map.current?.offlineUrls(snapshot.drive?.area||null)||[];
  if(!urls.length){setToast('Kaardipaanide loendit ei saanud koostada. Oota, kuni kaart on laadinud.');return;}
  const scope=new URL(import.meta.env.BASE_URL,location.href);
  controller.postMessage({type:'CACHE_APP_SHELL',urls:[scope.href,new URL('data/boundary.geojson',scope).href,new URL('data/wmts.xml',scope).href,...performance.getEntriesByType('resource').map(entry=>entry.name)]});
  setOffline({completed:0,failed:0,total:urls.length,done:false});
  controller.postMessage({type:'CACHE_MAP_PACKAGE',urls,name:snapshot.hunt.title,base});
 }
 const open=(next:Sheet)=>{setSelectedId(null);setSheet(current=>current===next?null:next);};
 const meters=(value:number)=>value<1000?Math.round(value)+' m':(value/1000).toFixed(1)+' km';
 const baseName=base==='kaart'?'Kaart':base==='foto'?'Ortofoto':'Hübriid';
 const title=snapshot.hunt.title+(snapshot.drive?' · '+snapshot.drive.sequence+'. '+snapshot.drive.title:'');
 const walking=mine?directionsUrl(mine.coordinates,'walking'):null,driving=mine?directionsUrl(mine.coordinates,'driving'):null;
 const meetingDrive=meeting?.coordinates?directionsUrl(meeting.coordinates,'driving'):null;
 const saving=Boolean(offline&&!offline.done);
 const placeWord=(role:string)=>isDriver(role)?'sisenemiskoht':'koht';
 return <main className="hunt-active guest-hunt">
  <MapCanvas ref={map} huntDriveArea={snapshot.drive?.area||null} huntMarkers={markers} wind={windVisible?{reading:windReading,error:windError,now:Date.now()}:undefined} huntDistanceOn={false} huntMode huntMoving={false} huntCanDrag={false} onHuntDrag={noop} onHuntSelect={id=>{if(id===MEETING_ID){setSelectedId(null);setSheet('meeting');return;}setSheet(null);setSelectedId(id);}} onHuntPlace={noop} measuring={measuring} onCloseMeasure={()=>setMeasuring(false)} searchResult={null} onClearSearch={noop} entries={[]} base={base} boundaryVisible drawing={null} drawingColor="#173e32" drawingWidth={3} drawType="Point" editGeometry={null} onGeometry={noop} onSelect={noop} onReady={noop} onError={setToast}/>
  <header className="topbar"><div className="brand guest-brand"><div className="brandicon"><Trees size={26}/></div><div><strong>Pärnjõe</strong><span>JAHIVAADE</span></div></div><div className="topactions"><button className="login" onClick={()=>{if(window.confirm('Sulgeda jahivaade? Uuesti avamiseks on vaja jahikoodi.'))onExit();}}><LogOut size={17}/><span>Välju</span></button></div></header>
  <div className="hunt-statusbar"><span className={`connection-dot ${online&&!stale?'is-online':'is-offline'}`}/><strong>{title}</strong><span>{online&&!stale?'Ainult vaatamine':'Salvestatud vaade · '+new Date(syncedAt).toLocaleTimeString('et-EE',{hour:'2-digit',minute:'2-digit'})}</span></div>
  <div className="basemap basemap-cycle"><button type="button" className="basemap-cycle-button" aria-label={`Aluskaart: ${baseName}. Vajuta kaardi vahetamiseks.`} title={`Aluskaart: ${baseName}`} onClick={()=>setBase(current=>current==='kaart'?'foto':current==='foto'?'hybriid':'kaart')}><svg className="basemap-layer-svg" viewBox="0 0 48 48" aria-hidden="true" fill="none"><path d="M24 6 42 21 24 35 6 21 24 6Z" fill="currentColor"/><path d="M7 29 24 42 41 29" stroke="currentColor" strokeWidth="5" strokeLinecap="square" strokeLinejoin="miter"/></svg><span className="tool-caption">{baseName}</span></button></div>
  <div className="guest-tools" role="group" aria-label="Kaardi tööriistad">
   {windVisible&&windReading&&<span className="guest-chip" role="status">Tuul {windReading.speed.toFixed(1)} m/s · {Math.round(windReading.direction)}°</span>}
   <button type="button" aria-pressed={windVisible} onClick={()=>setWindVisible(v=>!v)}><Wind size={19}/>Tuul</button>
   <button type="button" aria-label="Mõõda vahemaid kaardil" aria-pressed={measuring} onClick={()=>setMeasuring(v=>!v)}><Ruler size={19}/>Mõõda</button>
   <button type="button" aria-label="Ilmateade" aria-pressed={sheet==='weather'} onClick={()=>open('weather')}><CloudSun size={19}/>Ilm</button>
   <button type="button" disabled={saving} aria-label="Salvesta aju ala kaart võrguta kasutamiseks" title="Salvesta aju ala kaart võrguta kasutamiseks" aria-describedby={offline?'guest-offline-status':undefined} onClick={saveOfflineMap}><Download size={19}/>{saving?'Salvestan…':'Võrguta'}</button>
   {offline&&<span id="guest-offline-status" className="guest-chip" role="status">{offline.done?(offline.failed?offline.completed+'/'+offline.total+' paani, '+offline.failed+' puudu':'Kaart töötab ilma levita'):(offline.completed+offline.failed)+'/'+offline.total+' kaardipaani'}</span>}
  </div>
  <button type="button" className={`hunt-gps-toggle${gpsOn?' is-active':''}`} aria-pressed={gpsOn} title="Näita minu asukohta" aria-label="Näita minu asukohta kaardil" onClick={toggleGps}><LocateFixed size={22}/><span>GPS</span></button>
  {(selected||sheet)&&<section className="hunt-sheet guest-sheet" aria-label={selected?'Valitud jahikoht':sheet==='meeting'?'Kogunemine':sheet==='weather'?'Pärnjõe ilmateade':'Jahi paigutus'}>
   <button type="button" className="iconbtn guest-sheet-close" aria-label="Sulge" onClick={()=>{setSelectedId(null);setSheet(null);}}><X size={20}/></button>
   {selected?<>
    <h2>K{selected.number} · {selected.name}</h2><p className="muted">{roleLabel(selected.role)}{isDriver(selected.role)?' · sisenemiskoht':''}{selected.id===myId?' · sinu '+placeWord(selected.role):''}</p>
    {selected.id===myId?<button type="button" onClick={()=>{setMyId(null);setSelectedId(null);}}>See ei ole minu koht</button>:<button type="button" className="primary full" onClick={()=>{setMyId(selected.id);setSelectedId(null);}}>See olen mina</button>}
   </>:sheet==='meeting'&&meeting?<>
    <h2>Kogunemine</h2>
    {meeting.at&&<p className="guest-meeting-time">{meetingTime(meeting.at)}</p>}
    {meeting.note&&<p>{meeting.note}</p>}
    {meeting.coordinates?<p className="muted">Koht on kaardil tähistatud oranži lipuga.{toMeeting?' Sinust '+meters(toMeeting.meters)+'.':''}</p>:<p className="muted">Jahijuht ei ole kogunemiskohta kaardil määranud.</p>}
    {meetingDrive&&<a className="guest-sheet-link" href={meetingDrive} target="_blank" rel="noopener noreferrer">Juhata kogunemiskohta ↗</a>}
   </>:sheet==='weather'?<>
    <h2>Pärnjõe ilmateade</h2>
    <p className="muted">Open-Meteo prognoos · Pärnjõe piirkond</p>
    {weatherError&&<p role="alert" className="notice">{weatherError}</p>}
    <div className="guest-weather">{nextWeatherHours(weather,Date.now()).map(h=><div key={h.time}><strong>{new Date(h.time*1000).toLocaleTimeString('et-EE',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Tallinn'})}</strong><span>{h.temperature===null?'–':Math.round(h.temperature)+' °C'}</span><span>{h.wind===null?'–':h.wind.toFixed(1)+' m/s'}</span><span>{weatherDescription(h.code)}</span></div>)}</div>
    {!weather&&!weatherError&&<p>Laadin ilmateadet…</p>}
   </>:<>
    <h2>{snapshot.positions.length?'Vali oma nimi':'Paigutus puudub'}</h2>
    {!snapshot.positions.length&&<p className="muted">Jahijuht ei ole selles ajus veel kedagi kaardile paigutanud. Vaade uueneb ise.</p>}
    <div className="guest-list">{snapshot.positions.map(p=><button type="button" key={p.id} className={isDriver(p.role)?'is-driver':undefined} aria-pressed={p.id===myId} onClick={()=>{setMyId(p.id);setSheet(null);}}><strong>K{p.number}</strong><span>{p.name}</span><small>{p.id===myId?'✓ Minu '+placeWord(p.role):roleLabel(p.role)}</small></button>)}</div>
   </>}
  </section>}
  <nav className={`bottomnav hunt-dock guest-dock${meeting?' has-meeting':''}`} aria-label="Jahivaate tööriistad">
   <button aria-pressed={sheet==='list'} onClick={()=>open('list')}><Users/><span>Paigutus</span></button>
   {meeting&&<button aria-pressed={sheet==='meeting'} onClick={()=>open('meeting')}><Flag/><span>Kogunemine</span><small>{meetingClock||'Vaata'}</small></button>}
   <button className="add" onClick={()=>{setSelectedId(null);setSheet(null);map.current?.fitHunt(FIT_PADDING);}}><Navigation/><span>{mine?'K'+mine.number:'Minu koht'}</span><small>{toMine?meters(toMine.meters):mine?'Vaata kaardil':'Vali nimi'}</small></button>
  </nav>
  {mine&&!selected&&!sheet&&<aside className="guest-mine" aria-label="Minu jahikoht">
   <strong>Sinu {placeWord(mine.role)}: K{mine.number}</strong>
   {isDriver(mine.role)&&<span>{roleLabel(mine.role)} · siit lähed ajusse</span>}
   {toMine&&<span>Kohani {meters(toMine.meters)} · {Math.round(toMine.bearing)}° põhjast</span>}
   {neighbours.length>0&&<span>Kõrval: {neighbours.map(n=>n.position.name+' (K'+n.position.number+', '+meters(n.meters)+')').join(' ja ')}</span>}
   {meeting&&(meeting.at||meeting.note)&&<span>Kogunemine: {[meetingTime(meeting.at),meeting.note].filter(Boolean).join(' · ')}</span>}
   <span className="guest-mine-links">{driving&&<a href={driving} target="_blank" rel="noopener noreferrer">Autoga lähemale ↗</a>}{walking&&<a href={walking} target="_blank" rel="noopener noreferrer">Jalgsi ↗</a>}</span>
  </aside>}
  {gpsError&&<div className="guest-gps-error" role="alert">{gpsError}</div>}
  <footer className="attribution"><a href="https://geoportaal.maaruum.ee/avaandmete-litsents" target="_blank" rel="noreferrer">{base==='kaart'?'Aluskaart':'Ortofoto'}: Maa- ja Ruumiamet</a><br/><a href="https://metadata.geoportaal.ee/geonetwork/srv/api/records/608db693-7eb4-40f0-a1c5-c54e3f109790" target="_blank" rel="noreferrer">Piir: EELIS, Keskkonnaagentuur · CC BY 4.0</a><br/><span>Kaardipunkt ei asenda jahijuhi ohutuskorraldusi.</span></footer>
  {toast&&<div role="status" className="toast"><Info size={18}/><span>{toast}</span><button onClick={()=>setToast('')} aria-label="Sulge teade"><X size={17}/></button></div>}
 </main>;
}
