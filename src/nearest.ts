import proj4 from 'proj4';
import GeoJSON from 'ol/format/GeoJSON.js';
import './projection.ts';
import {label,type Entry} from './types.ts';

const meters=(value:number)=>value<1000?Math.round(value)+' m':(value/1000).toFixed(1)+' km';
/** Kõige lähem ala, joon või koht antud asukohast (EPSG:4326); ala sees öeldakse „Asud: …”. Tühi tekst, kui sobivat kirjet pole. */
export function nearestEntryLabel(coords:number[],entries:Entry[],allowed:string[]){
 const pt=proj4('EPSG:4326','EPSG:3301',coords);
 let best={name:'',distance:Infinity};
 const format=new GeoJSON();
 for(const e of entries.filter(e=>['area','line','place'].includes(e.kind)&&allowed.includes(e.kind))){
  const geom=format.readGeometry(e.geometry,{dataProjection:'EPSG:4326',featureProjection:'EPSG:3301'});
  if(!geom)continue;
  if(e.kind==='area'&&geom.intersectsCoordinate(pt))return 'Asud: '+label(e);
  const q=geom.getClosestPoint(pt);
  const distance=Math.hypot(q[0]-pt[0],q[1]-pt[1]);
  if(distance<best.distance)best={name:label(e),distance};
 }
 return best.name?`${best.name} · umbes ${meters(best.distance)}`:'';
}
