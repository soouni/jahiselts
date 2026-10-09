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
import {fromLonLat,toLonLat} from 'ol/proj';
import {Style,Fill,Stroke,Icon,Text} from 'ol/style';
import type {HuntPositionRow,HuntPersonRow} from './api';

import {huntMarkerUrl} from './markers';

export function HuntPositionMap({positions,people,onPlace}:{positions:HuntPositionRow[];people:HuntPersonRow[];onPlace:(coords:[number,number])=>void}){
 const [base,setBase]=useState<'kaart'|'foto'|'hybriid'>('foto');
 const layers=useRef<Record<string,TileLayer<WMTS>>>({});
 const el=useRef<HTMLDivElement>(null);
 const map=useRef<Map|null>(null);
 const source=useRef(new VectorSource());
 const boundary=useRef(new VectorSource());
 const onPlaceRef=useRef(onPlace);
 onPlaceRef.current=onPlace;
 useEffect(()=>{
  if(!el.current)return;
  const m=new Map({target:el.current,layers:[new VectorLayer({source:boundary.current,style:[new Style({stroke:new Stroke({color:'#fff',width:6}),fill:new Fill({color:'rgba(27,76,57,.05)'})}),new Style({stroke:new Stroke({color:'#d97726',width:3})})]}),new VectorLayer({source:source.current,declutter:true})],view:new View({center:fromLonLat([24.887,58.638]),zoom:11})});
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
  m.on('singleclick',event=>{const p=toLonLat(event.coordinate);onPlaceRef.current([p[0],p[1]]);});
  return()=>{cancelled=true;m.setTarget(undefined);map.current=null;layers.current={};boundary.current.clear();};
 },[]);
 useEffect(()=>{for(const [name,layer] of Object.entries(layers.current))layer.setVisible(name==='kaart'?base==='kaart':name==='foto'?base!=='kaart':base==='hybriid');},[base]);
 useEffect(()=>{
  const src=source.current;src.clear();
  positions.forEach(position=>{
   const feature=new Feature({geometry:new Point(fromLonLat(position.location.coordinates))});
   const person=people.find(p=>p.id===position.assigned_participant_id);
   const firstName=person?.display_name.trim().split(/\s+/)[0]||'Vaba';
   const duplicate=people.filter(p=>p.display_name.trim().split(/\s+/)[0]===firstName).length>1;
   const suffix=duplicate&&person?' '+(person.display_name.trim().split(/\s+/)[1]||'').slice(0,1)+'.':'';
   feature.setStyle(new Style({
    image:new Icon({src:huntMarkerUrl(person?.role||'hunter'),anchor:[0.5,0.5],scale:0.72}),
    text:new Text({text:firstName+suffix,font:'bold 12px sans-serif',offsetY:-31,overflow:false,fill:new Fill({color:'#153b30'}),stroke:new Stroke({color:'#fff',width:4}),padding:[2,3,2,3]})
   }));
   src.addFeature(feature);
  });
 },[positions,people]);
 return <div style={{position:'relative',width:'100%',height:'100%'}}><div ref={el} style={{width:'100%',height:'100%',minHeight:360,borderRadius:12,overflow:'hidden',border:'1px solid #ccd8d0'}} aria-label="Aju positsioonide kaart. Vajuta kaardile, et lisada positsioon."/><button type="button" style={{position:'absolute',top:8,right:8,zIndex:2,padding:'6px 9px',fontSize:12,maxWidth:'62%',minHeight:36,borderRadius:8,background:'white',color:'#153b30',fontWeight:700}} onClick={()=>setBase(b=>b==='kaart'?'foto':b==='foto'?'hybriid':'kaart')}>Aluskaart: {base==='kaart'?'Kaart':base==='foto'?'Ortofoto':'Hübriid'} ↻</button><small style={{position:'absolute',bottom:4,right:8,zIndex:2,background:'rgba(255,255,255,.85)',color:'#153b30'}}>Aluskaart: Maa- ja Ruumiamet</small></div>;
}
