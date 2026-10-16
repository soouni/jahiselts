import type {Entry} from './types';

const xmlEscape=(value:unknown)=>String(value??'').replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'
}[char]!));

type GpxEntry = Pick<Entry,'geometry'|'properties'>;

const entryName=(entry:GpxEntry)=>entry.properties.name||entry.properties.alias||entry.properties.type||'Pärnjõe objekt';

const entryDescription=(entry:GpxEntry)=>[
  entry.properties.type,
  entry.properties.alias,
  entry.properties.description
].filter(Boolean).join(' · ');

// Request a minimal dot marker for every exported waypoint.
// The Garmin device controls the actual appearance and size.
const garminSymbol=(_entry:Entry)=>'Dot';

function track(name:string,coordinates:any[],description=''){
  const points=coordinates
    .filter(point=>Array.isArray(point)&&point.length>=2)
    .map(([lon,lat])=>`<trkpt lat="${lat}" lon="${lon}"></trkpt>`)
    .join('');
  if(!points)return '';
  return `<trk><name>${xmlEscape(name)}</name>${description?`<desc>${xmlEscape(description)}</desc>`:''}<trkseg>${points}</trkseg></trk>`;
}

function geometryTracks(entry:GpxEntry){
  const geometry=entry.geometry;
  const name=entryName(entry);
  const description=entryDescription(entry);
  if(geometry.type==='LineString')return track(name,geometry.coordinates,description);
  if(geometry.type==='MultiLineString')return geometry.coordinates.map((coordinates:any[],index:number)=>track(`${name} ${index+1}`,coordinates,description)).join('');
  if(geometry.type==='Polygon')return geometry.coordinates.map((ring:any[],index:number)=>track(index?`${name} – sisepiir ${index}`:name,ring,description)).join('');
  if(geometry.type==='MultiPolygon')return geometry.coordinates.flatMap((polygon:any[][],polygonIndex:number)=>polygon.map((ring:any[],ringIndex:number)=>track(
    `${name}${polygonIndex?` ${polygonIndex+1}`:''}${ringIndex?` – sisepiir ${ringIndex}`:''}`,
    ring,
    description
  ))).join('');
  return '';
}

export function garminGpx(entries:Entry[],boundary?:any,exportedAt=new Date()){
  const version=exportedAt.toISOString().slice(0,16).replace('T','_').replace(':','-');
  // Export all active permanent map objects, including custom types and areas.
  const permanent=entries.filter(entry=>!entry.deleted_at&&
    ['place','line','area'].includes(entry.kind)
  );
  // Export every active point regardless of its custom type.
  const waypoints=permanent
    .filter(entry=>entry.kind==='place'&&entry.geometry.type==='Point')
    .map(entry=>{
      const [lon,lat]=entry.geometry.coordinates;
      const description=entryDescription(entry);
      return `<wpt lat="${lat}" lon="${lon}"><name>${xmlEscape(entryName(entry))}</name>${description?`<desc>${xmlEscape(description)}</desc>`:''}<type>${xmlEscape(entry.properties.type||'Koht')}</type><sym>${xmlEscape(garminSymbol(entry))}</sym></wpt>`;
    }).join('');
  const tracks=permanent.filter(entry=>entry.kind==='line'||entry.kind==='area').map(geometryTracks).join('');
  const boundaryEntry:GpxEntry|null=boundary?{geometry:boundary,properties:{name:'Pärnjõe jahipiir',type:'Jahipiir'}}:null;
  const boundaryTrack=boundaryEntry?geometryTracks(boundaryEntry):'';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Pärnjõe jahiseltsi kaart" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>Pärnjõe jahiseltsi kaart ${version} UTC</name><desc>JAH1000125 püsivad seltsiobjektid · eksport ${version} UTC</desc><time>${exportedAt.toISOString()}</time></metadata>${waypoints}${boundaryTrack}${tracks}</gpx>`;
}

export async function downloadGarminGpx(entries:Entry[]){
  let boundary:any=undefined;
  try{
    const response=await fetch(import.meta.env.BASE_URL+'data/boundary.geojson');
    if(response.ok){
      const geojson=await response.json();
      boundary=geojson.type==='FeatureCollection'?geojson.features?.[0]?.geometry:geojson.type==='Feature'?geojson.geometry:geojson;
    }
  }catch{}
  const exportedAt=new Date();
  const version=exportedAt.toISOString().slice(0,16).replace('T','_').replace(':','-');
  const url=URL.createObjectURL(new Blob([garminGpx(entries,boundary,exportedAt)],{type:'application/gpx+xml;charset=utf-8'}));
  const anchor=document.createElement('a');
  anchor.href=url;
  anchor.download=`parnjoe-garmin-${version}-UTC.gpx`;
  anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
