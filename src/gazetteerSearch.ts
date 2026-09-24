import type {Geometry} from './types';

export const gazetteerUrl='https://aks.geoportaal.ee/inaks/inaadress/gazetteer';
export const gazetteerSource='https://metadata.geoportaal.ee/geonetwork/srv/api/records/4a0f9f3b-f8fc-441d-9157-94b0120cc3cf';
export type OfficialPlace={
 id:string;name:string;type:string;detail:string;source:string;
 coordinates:[number,number];extent?:[number,number,number,number];
 geometry?:{format:'wkt';value:string}|{format:'geojson';value:Geometry};
};
type Row=Record<string,unknown>;
const record=(v:unknown):v is Row=>!!v&&typeof v==='object'&&!Array.isArray(v);
const rows=(v:unknown):Row[]=>Array.isArray(v)?v.filter(record):[];
const str=(v:unknown)=>typeof v==='string'?v.trim():'';
export const normalizedName=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('et').trim();
function coordinates(row:Row):[number,number]|null{
 const lon=Number(row.viitepunkt_l),lat=Number(row.viitepunkt_b);
 return Number.isFinite(lon)&&Number.isFinite(lat)&&lon>=19&&lon<=31&&lat>=56&&lat<=61?[lon,lat]:null;
}
function extent(row:Row):OfficialPlace['extent']{
 // In-AKS g_boundingbox lists latitude,longitude; GeoJSON uses longitude,latitude.
 const points=str(row.g_boundingbox).split(/\s+/).map(p=>p.split(',').map(Number));
 if(points.length<2||points.some(p=>p.length!==2||!p.every(Number.isFinite)||p[0]<56||p[0]>61||p[1]<19||p[1]>31))return;
 return [Math.min(...points.map(p=>p[1])),Math.min(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0]))];
}
function geometry(row:Row):OfficialPlace['geometry']{
 const wkt=str(row.kuju);
 if(wkt&&wkt.length<1500000&&/^(?:POINT|LINESTRING|POLYGON|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON)\s*\(/i.test(wkt))return {format:'wkt',value:wkt};
 try{
  const raw=typeof row.geometry==='string'?(row.geometry.length<1500000?JSON.parse(row.geometry):null):row.geometry;
  if(record(raw)&&['Point','LineString','Polygon','MultiPoint','MultiLineString','MultiPolygon'].includes(str(raw.type))&&Array.isArray(raw.coordinates))return {format:'geojson',value:raw as Geometry};
 }catch{/* A missing or malformed shape must not hide a valid reference point. */}
}
export function parseOfficialResults(data:unknown,query:string):OfficialPlace[]{
 if(!record(data)||!['addresses','knrs','pois'].some(k=>Array.isArray(data[k])))throw new Error('Invalid gazetteer response');
 const found:Array<OfficialPlace&{priority:number}>=[],seen=new Set<string>();
 function add(row:Row,id:string,name:string,type:string,detail:string,source:string,priority:number){
  const point=coordinates(row);
  if(!point||!name||seen.has(id)||row.olek&&row.olek!=='K')return;
  seen.add(id);found.push({id,name,type,detail,source,coordinates:point,extent:extent(row),geometry:geometry(row),priority});
 }
 for(const r of rows(data.knrs)){
  const id=str(r.knr_id);if(!id)continue;
  add(r,'knr:'+id,str(r.avalik_nimi),str(r.tyyp_nimi)||'Kohanimi',str(r.esindusaadress),str(r.andmeallikas)||'Kohanimeregister',0);
 }
 for(const r of rows(data.addresses)){
  const id=str(r.ads_oid)||str(r.adr_id);if(!id)continue;
  if(seen.has('knr:'+str(r.tunnus)))continue;
  const kind=str(r.liikVal),type=({EHAK:'Asustus- või haldusüksus',VAIKEKOHT:'Väikekoht',TANAV:'Tee või tänav',KATASTRIYKSUS:'Katastriüksus',EHITISHOONE:'Aadress'} as Record<string,string>)[kind]||'Aadress';
  const name=str(r.aadresstekst)||str(r.asustusyksus)||str(r.omavalitsus)||str(r.maakond)||str(r.ipikkaadress);
  add(r,'ads:'+id,name,type,str(r.ipikkaadress)||str(r.taisaadress),'Aadressiandmete süsteem',kind==='KATASTRIYKSUS'?2:0);
 }
 for(const parent of rows(data.pois))for(const r of rows(parent.poidDetail)){
  const id=typeof r.poi_id==='number'?String(r.poi_id):str(r.poi_id);if(!id)continue;
  add({...parent,...r},'poi:'+id,str(r.avalik_nimi),str(r.tyyp_nimi)||'Kohanimi',str(r.esindusaadress)||str(parent.ipikkaadress),str(r.andmeallikas)||'Maa- ja Ruumiamet',1);
 }
 const needle=normalizedName(query),match=(p:OfficialPlace)=>normalizedName(p.name)===needle?0:normalizedName(p.name).startsWith(needle)?1:2;
 const distance=(p:OfficialPlace)=>((p.coordinates[0]-24.887)*.52)**2+(p.coordinates[1]-58.638)**2;
 return found.sort((a,b)=>match(a)-match(b)||a.priority-b.priority||distance(a)-distance(b)||a.name.localeCompare(b.name,'et')).slice(0,40).map(({priority,...place})=>place);
}
export function officialSearchUrl(query:string,region:'637'|'all'){
 const url=new URL(gazetteerUrl);
 url.search=new URLSearchParams({address:query.trim(),knr:'1',poi:'1',results:'20',ihist:'0',iTappAsendus:'1',geometry:'1',features:'EHAK,VAIKEKOHT,TANAV,KATASTRIYKSUS',...(region==='637'?{ehak:'637'}:{})}).toString();
 return url.toString();
}
const cache=new Map<string,{at:number;places:OfficialPlace[]}>();
export async function searchOfficialPlaces(query:string,region:'637'|'all',signal:AbortSignal):Promise<OfficialPlace[]>{
 if(query.trim().length<3)return [];
 if(query.trim().length>150)throw new Error('Search text too long');
 const url=officialSearchUrl(query,region),cached=cache.get(url);
 if(cached&&Date.now()-cached.at<300000)return cached.places;
 const controller=new AbortController(),abort=()=>controller.abort();
 signal.addEventListener('abort',abort,{once:true});if(signal.aborted)controller.abort();
 const timer=setTimeout(abort,12000);
 try{
  const response=await fetch(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
  if(!response.ok)throw new Error('Gazetteer HTTP '+response.status);
  const places=parseOfficialResults(await response.json(),query);
  if(cache.size>=40)cache.delete(cache.keys().next().value!);
  cache.set(url,{at:Date.now(),places});return places;
 }finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
}
