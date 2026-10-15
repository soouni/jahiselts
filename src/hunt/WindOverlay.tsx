import {useEffect,useId,useState} from 'react';
import type Map from 'ol/Map';
import {windFlowDegrees,windIsCurrent,type WindReading} from './wind';
export type WindOverlayState={reading:WindReading|null;error:string;now:number};
export function WindOverlay({map,reading,error,now}:WindOverlayState&{map:Map}){
 const [rotation,setRotation]=useState(()=>map.getView().getRotation());
 const id=useId().replace(/[^a-zA-Z0-9_-]/g,'');
 useEffect(()=>{const view=map.getView(),update=()=>setRotation(view.getRotation());update();view.on('change:rotation',update);return()=>view.un('change:rotation',update);},[map]);
 const current=windIsCurrent(reading,now)&&!error;
 const calm=current&&reading!.speed<0.3;
 return <>
  {current&&!calm&&<svg className="wind-map-arrows" aria-hidden="true" width="100%" height="100%"><defs><pattern id={id} width="160" height="160" patternUnits="userSpaceOnUse"><g transform={`translate(80 80) rotate(${windFlowDegrees(reading!.direction,rotation)})`}><path d="M0 23V-23M-10-12L0-23 10-12" fill="none" stroke="#173e32" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/><path d="M0 23V-23M-10-12L0-23 10-12" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></g></pattern></defs><rect width="100%" height="100%" fill={`url(#${id})`}/></svg>}

 </>;
}
