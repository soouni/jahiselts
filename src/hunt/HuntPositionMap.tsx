import {useEffect,useRef} from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import OSM from 'ol/source/OSM';
import GeoJSON from 'ol/format/GeoJSON';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import {fromLonLat,toLonLat} from 'ol/proj';
import {Style,Fill,Stroke,Icon,Text} from 'ol/style';
import type {HuntPositionRow,HuntPersonRow} from './api';

function markerSvg(driver:boolean){
 const icon=driver
 ? '<path d="M8 5c-2 1-3 4-3 7l2 5 5-1 1-5-2-5zM17 13c-2 1-3 4-3 7l2 5 5-1 1-5-2-5z" transform="translate(0 -2) scale(.9)" fill="white"/><circle cx="8" cy="4" r="1.5" fill="white"/><circle cx="18" cy="12" r="1.5" fill="white"/>'
 : '<path d="M12 4h4l1 4v13H11V8zM12 3l1-2h2l1 2zM11 20h6v2h-6z" fill="white" transform="translate(-1 1)"/>';
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" fill="#176c52" stroke="white" stroke-width="4"/><g transform="translate(10 10) scale(1.15)">'+icon+'</g></svg>';
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
const hunterMarker=markerSvg(false);
const driverMarker=markerSvg(true);

export function HuntPositionMap({positions,people,onPlace}:{positions:HuntPositionRow[];people:HuntPersonRow[];onPlace:(coords:[number,number])=>void}){
 const el=useRef<HTMLDivElement>(null);
 const map=useRef<Map|null>(null);
 const source=useRef(new VectorSource());
 const boundary=useRef(new VectorSource());
 const onPlaceRef=useRef(onPlace);
 onPlaceRef.current=onPlace;
 useEffect(()=>{
  if(!el.current)return;
  const m=new Map({target:el.current,layers:[new TileLayer({source:new OSM()}),new VectorLayer({source:boundary.current,style:[new Style({stroke:new Stroke({color:'#fff',width:6}),fill:new Fill({color:'rgba(27,76,57,.05)'})}),new Style({stroke:new Stroke({color:'#d97726',width:3})})]}),new VectorLayer({source:source.current,declutter:false})],view:new View({center:fromLonLat([24.887,58.638]),zoom:11})});
  map.current=m;
  let cancelled=false;
  fetch(import.meta.env.BASE_URL+'data/boundary.geojson').then(response=>{if(!response.ok)throw new Error('Jahipiirkonna piir ei laadinud.');return response.json();}).then(geojson=>{
   if(cancelled)return;
   boundary.current.addFeatures(new GeoJSON().readFeatures(geojson,{dataProjection:'EPSG:4326',featureProjection:'EPSG:3857'}));
   const extent=boundary.current.getExtent();
   if(extent&&boundary.current.getFeatures().length&&!positions.length)m.getView().fit(extent,{padding:[25,25,25,25],maxZoom:13});
  }).catch(error=>{if(!cancelled)console.error('Jahipiirkonna piir:',error);});
  m.on('singleclick',event=>{const p=toLonLat(event.coordinate);onPlaceRef.current([p[0],p[1]]);});
  return()=>{cancelled=true;m.setTarget(undefined);map.current=null;boundary.current.clear();};
 },[]);
 useEffect(()=>{
  const src=source.current;src.clear();
  positions.forEach(position=>{
   const feature=new Feature({geometry:new Point(fromLonLat(position.location.coordinates))});
   const person=people.find(p=>p.id===position.assigned_participant_id);
   const firstName=person?.display_name.trim().split(/\s+/)[0]||'Vaba';
   const duplicate=people.filter(p=>p.display_name.trim().split(/\s+/)[0]===firstName).length>1;
   const suffix=duplicate&&person?' '+(person.display_name.trim().split(/\s+/)[1]||'').slice(0,1)+'.':'';
   const isDriver=person?.role==='driver';
   feature.setStyle(new Style({
    image:new Icon({src:isDriver?driverMarker:hunterMarker,anchor:[0.5,0.5],scale:0.85}),
    text:new Text({text:firstName+suffix,font:'bold 14px sans-serif',offsetY:-36,fill:new Fill({color:'#153b30'}),stroke:new Stroke({color:'#fff',width:5}),padding:[3,4,3,4]})
   }));
   src.addFeature(feature);
  });
 },[positions,people]);
 return <div ref={el} style={{width:'100%',height:360,borderRadius:12,overflow:'hidden',border:'1px solid #ccd8d0'}} aria-label="Aju positsioonide kaart. Vajuta kaardile, et lisada positsioon."/>;
}
