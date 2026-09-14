import {useEffect,useState} from 'react';
import type Map from 'ol/Map';

const directions=[{name:'PÕHI',angle:0},{name:'IDA',angle:Math.PI/2},{name:'LÕUNA',angle:Math.PI},{name:'LÄÄS',angle:3*Math.PI/2}];
export function MapCompass({map}:{map:Map}){
 const [rotation,setRotation]=useState(()=>map.getView().getRotation());
 useEffect(()=>{
  const view=map.getView(),update=()=>setRotation(view.getRotation());
  update();view.on('change:rotation',update);
  return()=>view.un('change:rotation',update);
 },[map]);
 return <button type="button" className="map-compass" aria-label="Ilmakaared. Pööra kaart põhjaga üles" title="Ilmakaared · vajuta, et põhi oleks üleval" onClick={()=>map.getView().animate({rotation:0,duration:250})}>
  <svg viewBox="0 0 120 120" aria-hidden="true">
   <circle cx="60" cy="60" r="25" fill="none" stroke="#d8e2dc"/>
   <g transform={`rotate(${rotation*180/Math.PI} 60 60)`}>
    <path d="M60 34V86M34 60H86" stroke="#879b8e" strokeWidth="2"/>
    <path d="M60 31L53 61L60 57L67 61Z" fill="#be4333"/>
    <path d="M60 89L55 62L60 65L65 62Z" fill="#466558"/>
   </g>
   {directions.map(({name,angle})=><text key={name} x={60+42*Math.sin(angle+rotation)} y={60-42*Math.cos(angle+rotation)} textAnchor="middle" dominantBaseline="central" fill={angle===0?'#a73426':'#244a3b'} fontSize="12" fontWeight="750">{name}</text>)}
  </svg>
 </button>;
}
