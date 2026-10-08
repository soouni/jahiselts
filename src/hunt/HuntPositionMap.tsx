import {useEffect,useRef} from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import {fromLonLat,toLonLat} from 'ol/proj';
import {Style,Fill,Stroke,Circle as CircleStyle,Text} from 'ol/style';
import type {HuntPositionRow,HuntPersonRow} from './api';

export function HuntPositionMap({positions,people,onPlace}:{positions:HuntPositionRow[];people:HuntPersonRow[];onPlace:(coords:[number,number])=>void}){
 const el=useRef<HTMLDivElement>(null);
 const map=useRef<Map|null>(null);
 const source=useRef(new VectorSource());
 const onPlaceRef=useRef(onPlace);
 onPlaceRef.current=onPlace;
 useEffect(()=>{
  if(!el.current)return;
  const m=new Map({target:el.current,layers:[new TileLayer({source:new OSM()}),new VectorLayer({source:source.current,declutter:false})],view:new View({center:fromLonLat([24.887,58.638]),zoom:11})});
  map.current=m;
  m.on('singleclick',event=>{const p=toLonLat(event.coordinate);onPlaceRef.current([p[0],p[1]]);});
  return()=>{m.setTarget(undefined);map.current=null;};
 },[]);
 useEffect(()=>{
  const src=source.current;src.clear();
  positions.forEach(position=>{
   const feature=new Feature({geometry:new Point(fromLonLat(position.location.coordinates))});
   const person=people.find(p=>p.id===position.assigned_participant_id);
   const firstName=person?.display_name.trim().split(/\s+/)[0]||'Vaba';
   const duplicate=people.filter(p=>p.display_name.trim().split(/\s+/)[0]===firstName).length>1;
   const suffix=duplicate&&person?' '+(person.display_name.trim().split(/\s+/)[1]||'').slice(0,1)+'.':'';
   feature.setStyle(new Style({
    image:new CircleStyle({radius:9,fill:new Fill({color:'#176c52'}),stroke:new Stroke({color:'#fff',width:3})}),
    text:new Text({text:'K'+position.number+' '+firstName+suffix,font:'bold 14px sans-serif',offsetY:-24,fill:new Fill({color:'#153b30'}),stroke:new Stroke({color:'#fff',width:5}),padding:[3,4,3,4]})
   }));
   src.addFeature(feature);
  });
 },[positions,people]);
 return <div ref={el} style={{width:'100%',height:360,borderRadius:12,overflow:'hidden',border:'1px solid #ccd8d0'}} aria-label="Aju positsioonide kaart. Vajuta kaardile, et lisada positsioon."/>;
}
