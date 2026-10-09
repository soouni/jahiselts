import {useEffect,useRef,useState} from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import type WMTS from 'ol/source/WMTS';
import {createBasemapSource} from '../basemaps';
import GeoJSON from 'ol/format/GeoJSON';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import {Draw} from 'ol/interaction';
import {fromLonLat,toLonLat} from 'ol/proj';
import {Style,Fill,Stroke,Icon,Text} from 'ol/style';
import type {HuntPositionRow,HuntPersonRow} from './api';

import {huntMarkerUrl} from './markers';

export function HuntPositionMap({positions,people,onPlace,onAssign,onMove,canEdit=false,driveArea=null,onAreaDraw}:{positions:HuntPositionRow[];people:HuntPersonRow[];onPlace:(coords:[number,number])=>void;onAssign?:(positionId:string,personId:string)=>void;onMove?:(positionId:string)=>void;canEdit?:boolean;driveArea?:{type:'Polygon';coordinates:[number,number][][]}|null;onAreaDraw?:(area:{type:'Polygon';coordinates:[number,number][][]})=>void}){
 const [areaDrawing,setAreaDrawing]=useState(false);
 const drawInteraction=useRef<Draw|null>(null);
 const areaSource=useRef(new VectorSource());
 const areaDrawCallback=useRef(onAreaDraw);areaDrawCallback.current=onAreaDraw;
 const [editingId,setEditingId]=useState<string|null>(null);
 const [base,setBase]=useState<'kaart'|'foto'|'hybriid'>('foto');
 const layers=useRef<Record<string,TileLayer<WMTS>>>({});
 const el=useRef<HTMLDivElement>(null);
 const map=useRef<Map|null>(null);
 const source=useRef(new VectorSource());
 const boundary=useRef(new VectorSource());
 const onPlaceRef=useRef(onPlace);
 const onMarkerRef=useRef((id:string)=>setEditingId(id));
 onPlaceRef.current=onPlace;
 useEffect(()=>{
  if(!el.current)return;
  const m=new Map({target:el.current,layers:[new VectorLayer({source:areaSource.current,style:new Style({fill:new Fill({color:'rgba(249,115,22,.15)'}),stroke:new Stroke({color:'#ea580c',width:3,lineDash:[9,5]})})}),new VectorLayer({source:boundary.current,style:[new Style({stroke:new Stroke({color:'#fff',width:6}),fill:new Fill({color:'rgba(27,76,57,.05)'})}),new Style({stroke:new Stroke({color:'#d97726',width:3})})]}),new VectorLayer({source:source.current,declutter:true})],view:new View({center:fromLonLat([24.887,58.638]),zoom:11})});
  map.current=m;
  let cancelled=false;
  fetch(import.meta.env.BASE_URL+'data/wmts.xml').then(r=>{if(!r.ok)throw Error('WMTS ei laadinud');return r.text();}).then(xml=>{
   if(cancelled)return;
   const capabilities=new WMTSCapabilities().read(xml);
   for(const name of ['kaart','foto','hybriid']){
    const layer=new TileLayer({source:createBasemapSource(capabilities,name),visible:name==='foto'});
    layers.current[name]=layer;
    m.getLayers().insertAt(['kaart','foto','hybriid'].indexOf(name),layer);
   }
   for(const [name,layer] of Object.entries(layers.current))layer.setVisible(name==='kaart'?base==='kaart':name==='foto'?base!=='kaart':base==='hybriid');
  }).catch(error=>{if(!cancelled)console.error('Jahi aluskaart:',error);});
  fetch(import.meta.env.BASE_URL+'data/boundary.geojson').then(response=>{if(!response.ok)throw new Error('Jahipiirkonna piir ei laadinud.');return response.json();}).then(geojson=>{
   if(cancelled)return;
   boundary.current.addFeatures(new GeoJSON().readFeatures(geojson,{dataProjection:'EPSG:4326',featureProjection:'EPSG:3857'}));
   const extent=boundary.current.getExtent();
   if(extent&&boundary.current.getFeatures().length&&!positions.length)m.getView().fit(extent,{padding:[25,25,25,25],maxZoom:13});
  }).catch(error=>{if(!cancelled)console.error('Jahipiirkonna piir:',error);});
  m.on('singleclick',event=>{if(drawInteraction.current)return;const hit=m.forEachFeatureAtPixel(event.pixel,f=>f.get('huntPositionId') as string|undefined,{hitTolerance:12});if(hit){onMarkerRef.current(hit);return;}setEditingId(null);const p=toLonLat(event.coordinate);onPlaceRef.current([p[0],p[1]]);});
  return()=>{cancelled=true;if(drawInteraction.current)m.removeInteraction(drawInteraction.current);m.setTarget(undefined);map.current=null;layers.current={};boundary.current.clear();};
 },[]);
 useEffect(()=>{for(const [name,layer] of Object.entries(layers.current))layer.setVisible(name==='kaart'?base==='kaart':name==='foto'?base!=='kaart':base==='hybriid');},[base]);
 useEffect(()=>{
  const src=source.current;src.clear();
  positions.forEach(position=>{
   const feature=new Feature({geometry:new Point(fromLonLat(position.location.coordinates))});
   feature.set('huntPositionId',position.id);
   const person=people.find(p=>p.id===position.assigned_participant_id);
   const firstName=person?.display_name.trim().split(/\s+/)[0]||'Vaba';
   const duplicate=people.filter(p=>p.display_name.trim().split(/\s+/)[0]===firstName).length>1;
   const suffix=duplicate&&person?' '+(person.display_name.trim().split(/\s+/)[1]||'').slice(0,1)+'.':'';
   feature.setStyle(new Style({
    image:new Icon({src:huntMarkerUrl(person?.role||'hunter'),anchor:[0.5,0.5],scale:0.72,declutterMode:'none'}),
    text:new Text({text:firstName+suffix,font:'bold 12px sans-serif',offsetY:-31,overflow:false,fill:new Fill({color:'#153b30'}),stroke:new Stroke({color:'#fff',width:4}),padding:[2,3,2,3]})
   }));
   src.addFeature(feature);
  });
 },[positions,people]);
 useEffect(()=>{
  areaSource.current.clear();
  if(driveArea?.type==='Polygon'&&driveArea.coordinates?.length){
   try{areaSource.current.addFeature(new Feature({geometry:new Polygon(driveArea.coordinates.map(ring=>ring.map(point=>fromLonLat(point))))}));}catch(e){console.error('Aju ala:',e);}
  }
 },[driveArea]);
 useEffect(()=>{
  const m=map.current;if(!m||!areaDrawing||!canEdit)return;
  const draw=new Draw({type:'Polygon',source:areaSource.current});drawInteraction.current=draw;m.addInteraction(draw);
  draw.on('drawstart',()=>{areaSource.current.clear();});
  draw.on('drawend',event=>{
   const geometry=event.feature.getGeometry();if(!(geometry instanceof Polygon))return;
   const coordinates=geometry.getCoordinates().map(ring=>ring.map(point=>toLonLat(point) as [number,number]));
   if(coordinates[0]?.length>=4){areaDrawCallback.current?.({type:'Polygon',coordinates});}setAreaDrawing(false);
  });
  return()=>{m.removeInteraction(draw);drawInteraction.current=null;};
 },[areaDrawing,canEdit]);
 const editing=positions.find(p=>p.id===editingId);
 const assigned=people.find(p=>p.id===editing?.assigned_participant_id);
 return <div style={{position:'relative',width:'100%',height:'100%'}}>{canEdit&&<div style={{position:'absolute',top:10,left:10,zIndex:5,display:'flex',gap:6,background:'#fff',padding:6,borderRadius:8}}><button type="button" onClick={()=>setAreaDrawing(v=>!v)}>{areaDrawing?'Tühista ala':'Joonista aju ala'}</button>{areaDrawing&&<button type="button" onClick={()=>drawInteraction.current?.finishDrawing()}>Lõpeta joonistamine</button>}</div>}<div ref={el} style={{width:'100%',height:'100%',minHeight:360,borderRadius:12,overflow:'hidden',border:'1px solid #ccd8d0'}} aria-label="Aju positsioonide kaart. Vajuta kaardile, et lisada positsioon."/><button type="button" style={{position:'absolute',top:8,right:8,zIndex:2,padding:'6px 9px',fontSize:12,maxWidth:'62%',minHeight:36,borderRadius:8,background:'white',color:'#153b30',fontWeight:700}} onClick={()=>setBase(b=>b==='kaart'?'foto':b==='foto'?'hybriid':'kaart')}>Aluskaart: {base==='kaart'?'Kaart':base==='foto'?'Ortofoto':'Hübriid'} ↻</button>{editing&&<div style={{position:'absolute',left:8,bottom:34,zIndex:5,background:'#fff',borderRadius:10,padding:12,maxWidth:'min(340px,calc(100% - 16px))',boxShadow:'0 4px 18px #0004',color:'#153b30'}}><div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center'}}><strong>{assigned?.display_name||'Vaba positsioon'} · K{editing.number}</strong><button type="button" onClick={()=>setEditingId(null)} aria-label="Sulge positsiooni muutmine">✕</button></div>{canEdit&&<><label style={{display:'block',marginTop:10}}>Jahimees<select aria-label="Muuda positsiooni jahimeest" style={{display:'block',width:'100%',marginTop:5}} value={editing.assigned_participant_id||''} onChange={e=>onAssign?.(editing.id,e.target.value)}><option value="">Vaba positsioon</option>{people.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select></label><button type="button" style={{marginTop:8}} onClick={()=>{onMove?.(editing.id);setEditingId(null);}}>Muuda asukohta kaardil</button></>}{!canEdit&&<small>Positsiooni muutmiseks on vaja jahijuhi või administraatori õigusi.</small>}</div>}<small style={{position:'absolute',bottom:4,right:8,zIndex:2,background:'rgba(255,255,255,.85)',color:'#153b30'}}>Aluskaart: Maa- ja Ruumiamet</small></div>;
}
