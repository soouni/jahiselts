import {useEffect,useState} from 'react';
import {Cloud,CloudFog,CloudLightning,CloudRain,CloudSnow,CloudSun,LoaderCircle,Moon,RefreshCw,Sun} from 'lucide-react';
import {loadParnjoeForecast,nextWeatherHours,readWeatherCache,weatherDescription,weatherIsStale,type WeatherForecast,type WeatherHour} from './weather';

const clock=new Intl.DateTimeFormat('et-EE',{timeZone:'Europe/Tallinn',hour:'2-digit',minute:'2-digit'});
const date=new Intl.DateTimeFormat('et-EE',{timeZone:'Europe/Tallinn',day:'2-digit',month:'2-digit'});
const fullTime=new Intl.DateTimeFormat('et-EE',{timeZone:'Europe/Tallinn',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',timeZoneName:'short'});
const fmt=(value:number|null,digits=1)=>value===null?'—':value.toLocaleString('et-EE',{maximumFractionDigits:digits});
const directions=['N','NE','E','SE','S','SW','W','NW'];
function WeatherIcon({hour}:{hour:WeatherHour}){
 const text=weatherDescription(hour.code);
 const Icon=text==='Äike'?CloudLightning:text==='Lumesadu'?CloudSnow:text==='Vihm'||text==='Uduvihm'?CloudRain:text==='Udu'?CloudFog:hour.code===0?(hour.day?Sun:Moon):hour.code===1||hour.code===2?(hour.day?CloudSun:Moon):Cloud;
 return <span className="weather-icon" role="img" aria-label={text} title={text}><Icon aria-hidden="true" size={22}/></span>;
}
function browserStorage(){try{return window.localStorage;}catch{return undefined;}}
export function WeatherPanel(){
 const [forecast,setForecast]=useState<WeatherForecast|null>(()=>{const storage=browserStorage();return storage?readWeatherCache(storage):null;});
 const [loading,setLoading]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0),[now,setNow]=useState(Date.now());
 useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{
  let alive=true;
  const controller=new AbortController();
  const timeout=window.setTimeout(()=>controller.abort(),12000);
  setLoading(true);setError('');
  loadParnjoeForecast(controller.signal,browserStorage()).then(data=>{if(alive){setForecast(data);setNow(Date.now());}}).catch(()=>{if(alive)setError('Ilmateadet ei saanud uuendada. Kontrolli võrguühendust ja proovi uuesti.');}).finally(()=>{window.clearTimeout(timeout);if(alive)setLoading(false);});
  const refresh=window.setInterval(()=>setRevision(v=>v+1),15*60*1000);
  return()=>{alive=false;window.clearTimeout(timeout);window.clearInterval(refresh);controller.abort();};
 },[revision]);
 const hours=nextWeatherHours(forecast,now),stale=forecast&&weatherIsStale(forecast,now);
 return <section className="weather-panel" aria-label="Pärnjõe järgmise kuue tunni ilmaprognoos" aria-busy={loading}>
  <div className="weather-heading"><div><h3>Pärnjõe</h3><p>Järgmised 6 tundi</p></div><button type="button" className="weather-refresh" disabled={loading} onClick={()=>setRevision(v=>v+1)} aria-label="Uuenda ilmateadet">{loading?<LoaderCircle className="spin" size={18}/>:<RefreshCw size={18}/>}<span>Uuenda</span></button></div>
  {error&&<p className="notice" role="alert">{error}{hours.length>0?' Kuvatud on varem laaditud prognoos.':''}</p>}
  {stale&&hours.length>0&&<p className="notice" role="status">Salvestatud prognoos on üle 30 minuti vana. Uuenda enne kasutamist.</p>}
  {!hours.length&&<p role="status">{loading?'Laadin Pärnjõe ilmateadet…':forecast?'Salvestatud prognoos ei kata enam järgmisi tunde. Vajuta „Uuenda“.':'Ilmateade pole veel laaditud.'}</p>}
  {hours.length>0&&<><table className="weather-table"><caption className="weather-sr-only">Pärnjõe tunniprognoos. Temperatuur Celsiuse kraadides, sademed millimeetrites ning tuul ja puhangud meetrites sekundis.</caption><thead><tr><th scope="col">Kell</th><th scope="col">Ilm / °C</th><th scope="col">Sadu<br/><small>mm</small></th><th scope="col">Tuul<br/><small>m/s</small></th><th scope="col">Puhang<br/><small>m/s</small></th></tr></thead><tbody>{hours.map(hour=><tr key={hour.time}><th scope="row"><time dateTime={new Date(hour.time*1000).toISOString()} title={fullTime.format(hour.time*1000)} aria-label={fullTime.format(hour.time*1000)}>{clock.format(hour.time*1000)}<small>{date.format(hour.time*1000)}</small></time></th><td><div className="weather-temperature"><WeatherIcon hour={hour}/><strong>{fmt(hour.temperature)}</strong></div></td><td>{fmt(hour.precipitation)}</td><td>{fmt(hour.wind)}<small>{hour.direction===null?'Suund —':directions[Math.round(hour.direction/45)%8]}</small></td><td>{fmt(hour.gust)}</td></tr>)}</tbody></table>{hours.length<6&&<p className="muted">Saadaval on {hours.length} tunni prognoos. Proovi andmeid uuendada.</p>}</>}
  <p className="weather-updated" role="status">{forecast?'Laaditud '+fullTime.format(forecast.fetchedAt):''}{loading&&forecast?' · uuendan…':''}</p>
  <p className="weather-source">Allikas: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> · mudelprognoos Pärnjõe jahipiirkonnale. Ajad on Eesti ajas. Sademed näitavad kogust märgitud kellaajale eelnenud tunni jooksul. Tuul on 10 m kõrgusel; metsas võib see erineda.</p>
 </section>;
}
