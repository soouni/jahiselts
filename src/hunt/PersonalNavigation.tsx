import {useEffect,useState} from 'react';
import {Car,Footprints,Navigation,Trash2} from 'lucide-react';
import {distanceAndBearing,relativeBearing} from './navigation';
import {directionsUrl,readParking,saveParking,clearParking,type ParkingSpot} from './parking';

type Fix={coords:[number,number];accuracy:number;at:number};
type Props={userId:string;destination?:[number,number];fix:Fix|null;gpsReady:boolean;heading:number|null;now:number;startGps:()=>void;showOnMap:(coords:[number,number]|null)=>void};
export function PersonalNavigation({userId,destination,fix,gpsReady,heading,now,startGps,showOnMap}:Props){
 const [parking,setParking]=useState<ParkingSpot|null>(null),[message,setMessage]=useState('');
 useEffect(()=>()=>showOnMap(null),[userId]);
 const [target,setTarget]=useState<'position'|'car'|null>(null);
 useEffect(()=>{setParking(readParking(localStorage,userId));setTarget(null);setMessage('');},[userId]);
 useEffect(()=>{if(parking&&parking.expiresAt<=now){clearParking(localStorage,userId);showOnMap(null);setParking(null);setTarget('position');setMessage('Salvestatud auto asukoht aegus.');}},[now,parking,userId]);
 // Prevent a previous account's spot appearing even before the account-change effect.
 const ownParking=parking?.userId===userId&&parking.expiresAt>now?parking:null;
 const coords=target==='car'?ownParking?.coordinates:target==='position'?destination:undefined;
 const direction=coords&&fix&&gpsReady?distanceAndBearing(fix.coords,coords):null;
 function rememberCar(){try{if(!fix||!gpsReady)throw new Error('Käivita GPS ja oota uut asukohta.');setParking(saveParking(localStorage,userId,fix));showOnMap(null);setMessage('Auto asukoht salvestatud sellesse seadmesse 48 tunniks.');}catch(e){setMessage(e instanceof Error?e.message:'Auto asukohta ei saanud seadmesse salvestada.');}}
 const driving=destination&&directionsUrl(destination,'driving');
 const walking=coords&&directionsUrl(coords,'walking');
 return <section className="personal-navigation" aria-label="Teejuhised ja minu auto">
  {destination&&<details><summary><Navigation size={18}/> Juhata positsioonile</summary><div className="personal-nav-actions">
   {driving&&<a href={driving} target="_blank" rel="noopener noreferrer"><Car size={18}/> Autoga lähemale ↗</a>}
   <button type="button" onClick={()=>{setTarget('position');startGps();}}><Footprints size={18}/> Jalgsi positsioonile</button>
  </div><p>Avaneb Google Maps. Autosõidu siht on sinu positsioon. Vali ise sobiv tee ja peatumiskoht; metsatee läbitavus pole tagatud.</p></details>}
  {direction&&<div className="personal-walk" role="status"><Navigation aria-hidden="true" style={{transform:`rotate(${relativeBearing(direction.bearing,heading)-45}deg)`}}/><div><strong>{target==='car'?'Autoni':'Positsioonini'} {direction.meters<1000?Math.round(direction.meters)+' m':(direction.meters/1000).toFixed(1)+' km'}</strong><small>Linnulennult · {Math.round(direction.bearing)}° põhjast{heading===null?' · kompass ei tööta':''}</small></div></div>}
  {target==='car'&&ownParking&&!direction&&<p>Käivita GPS, et näha suunda ja kaugust autoni.</p>}
  {walking&&<a className="personal-map-link" href={walking} target="_blank" rel="noopener noreferrer">Ava kõnnijuhised Google Mapsis ↗</a>}
  <div className="personal-car"><strong><Car size={18}/> Minu auto</strong>
   {ownParking?<><small>Salvestatud {new Date(ownParking.savedAt).toLocaleString('et-EE')} · täpsus ±{Math.round(ownParking.accuracy)} m</small><div className="personal-nav-actions"><button type="button" onClick={()=>{setTarget('car');startGps();}}>Juhata autoni</button><button type="button" onClick={()=>showOnMap(ownParking.coordinates)}>Näita autot kaardil</button><button type="button" disabled={!gpsReady||!fix||fix.accuracy>50} onClick={rememberCar}>Uuenda auto asukohta</button><button type="button" onClick={()=>{clearParking(localStorage,userId);showOnMap(null);setParking(null);setTarget('position');setMessage('Auto asukoht kustutatud.');}}><Trash2 size={16}/> Kustuta</button></div></>:<button type="button" disabled={!userId||!gpsReady||!fix||fix.accuracy>50} onClick={rememberCar}>Jätsin auto siia</button>}
   {!gpsReady&&<p>Käivita GPS, et auto asukoht salvestada.</p>}{gpsReady&&fix&&fix.accuracy>50&&<p>Oota GPS-i täpsust kuni ±50 m.</p>}
   <small>Ainult selles seadmes, 48 tundi. Seltsiga ei jagata. Väljalogimine kustutab asukoha.</small>
  </div>{message&&<p role="status">{message}</p>}
 </section>;
}
