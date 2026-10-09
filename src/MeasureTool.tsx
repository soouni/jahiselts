import {useEffect,useRef,useState} from 'react';
import {Check,Ruler,RotateCcw,Square,Circle,ChevronUp,ChevronDown,X} from 'lucide-react';
import type Map from 'ol/Map';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import Point from 'ol/geom/Point';
import type Geometry from 'ol/geom/Geometry';
import {Draw,DoubleClickZoom} from 'ol/interaction';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import {Style,Stroke,Fill,Circle as CircleStyle} from 'ol/style';
import {unByKey} from 'ol/Observable';
import type {EventsKey} from 'ol/events';
import {circleGeometry,measureGeometry,lengthLabel,areaLabel,type Measurement} from './measurement';

const empty:Measurement={length:0,area:0,points:0,valid:false,crossed:false};
const style=[new Style({stroke:new Stroke({color:'#18372d',width:7})}),new Style({stroke:new Stroke({color:'#ffe066',width:4}),fill:new Fill({color:'rgba(255,224,102,.15)'}),image:new CircleStyle({radius:6,fill:new Fill({color:'#ffe066'}),stroke:new Stroke({color:'#18372d',width:2})})})];
export function MeasureTool({map,onClose}:{map:Map;onClose:()=>void}){
 const [collapsed,setCollapsed]=useState(false);
 const [mode,setMode]=useState<'LineString'|'Polygon'|'Circle'>('LineString'),[revision,setRevision]=useState(0);
 const [result,setResult]=useState(empty),[committedResult,setCommittedResult]=useState(empty),[finished,setFinished]=useState(false),[canFinish,setCanFinish]=useState(false),[closedArea,setClosedArea]=useState<number|null>(null);
 const draw=useRef<Draw|null>(null),complete=useRef(false),sketch=useRef<Geometry|null>(null);
 useEffect(()=>{
  const radiusLine=new Feature<Geometry>(),centerPoint=new Feature<Geometry>();
  const source=new VectorSource(),layer=new VectorLayer({source,style,zIndex:100});
  const zoom=map.getInteractions().getArray().filter(i=>i instanceof DoubleClickZoom).map(i=>({i,active:i.getActive()}));
  zoom.forEach(({i})=>i.setActive(false));
  let listener:EventsKey|undefined;
  let closingArea:Measurement|null=null;
  const viewport=map.getViewport();
  const closeOnFirstPoint=(event:PointerEvent)=>{
   if(mode!=='LineString'||!sketch.current||!(sketch.current instanceof LineString)||event.button!==0)return;
   const coords=sketch.current.getCoordinates();
   const committed=coords.slice(0,-1);
   if(committed.length<3)return;
   const pixel=map.getPixelFromCoordinate(committed[0]);
   const bounds=viewport.getBoundingClientRect();
   if(Math.hypot(event.clientX-bounds.left-pixel[0],event.clientY-bounds.top-pixel[1])>16)return;
   const polygon=new Polygon([[...committed,committed[0]]]);
   const area=measureGeometry(polygon);
   if(!area.valid||area.crossed)return;
   event.preventDefault();event.stopPropagation();
   closingArea=area;
   d.finishDrawing();
  };
  viewport.addEventListener('pointerdown',closeOnFirstPoint,true);
  setResult(empty);setCommittedResult(empty);setClosedArea(null);setFinished(false);setCanFinish(false);complete.current=false;
  const d=new Draw({source,type:mode,geometryFunction:mode==='Circle'?circleGeometry:undefined,style,stopClick:true,finishCondition:()=>complete.current});draw.current=d;
  map.addLayer(layer);map.addInteraction(d);
  d.on('drawstart',e=>{
   if(listener)unByKey(listener);source.clear();if(mode==='Circle')source.addFeatures([radiusLine,centerPoint]);sketch.current=e.feature.getGeometry()!;
   const update=()=>{const g=sketch.current!;if(mode==='Circle'){radiusLine.setGeometry(new LineString([g.get('measurementCenter'),g.get('measurementEdge')]));centerPoint.setGeometry(new Point(g.get('measurementCenter')));}const committed=measureGeometry(g,true);setResult(measureGeometry(g));setCommittedResult(committed);complete.current=committed.valid;setCanFinish(complete.current);};
   listener=sketch.current.on('change',update);update();
  });
  d.on('drawend',e=>{
   if(listener)unByKey(listener);listener=undefined;
   const final=closingArea??measureGeometry(e.feature.getGeometry()!);
   if(closingArea){const coords=(e.feature.getGeometry() as LineString).getCoordinates();const committed=coords.slice(0,-1);e.feature.setGeometry(new Polygon([[...committed,committed[0]]]));setClosedArea(closingArea.area);}
   setResult(final);setCommittedResult(final);setFinished(true);sketch.current=null;
  });
  d.on('drawabort',()=>{if(listener)unByKey(listener);listener=undefined;sketch.current=null;closingArea=null;setClosedArea(null);complete.current=false;setResult(empty);setCommittedResult(empty);setCanFinish(false);});
  return()=>{viewport.removeEventListener('pointerdown',closeOnFirstPoint,true);if(listener)unByKey(listener);map.removeInteraction(d);map.removeLayer(layer);source.clear();zoom.forEach(({i,active})=>i.setActive(active));draw.current=null;sketch.current=null;};
 },[map,mode,revision]);
 useEffect(()=>{if(finished)draw.current?.setActive(false);},[finished]);
 const polygon=mode==='Polygon',circle=mode==='Circle';
 return <section className={`measure-panel${collapsed?' is-collapsed':''}`} aria-label="Kaardil mõõtmine">
  <header><strong>Mõõda kaardil</strong><div className="measure-header-actions"><button className="measure-toggle" aria-expanded={!collapsed} aria-label={collapsed?'Ava mõõtmispaneel':'Vähenda mõõtmispaneeli, mõõtmine jätkub'} onClick={()=>setCollapsed(v=>!v)}>{collapsed?<ChevronDown size={18}/>:<ChevronUp size={18}/>} {collapsed?'Ava':'Vähenda'}</button><button className="iconbtn" aria-label="Sulge mõõtmine ja eemalda mõõtjoon" onClick={onClose}><X size={20}/></button></div></header>
  <div hidden={collapsed}><div className="measure-modes" role="group" aria-label="Mõõtmise tüüp"><button aria-pressed={mode==='LineString'} onClick={()=>setMode('LineString')}><Ruler size={18}/> Pikkus</button><button aria-pressed={polygon} onClick={()=>setMode('Polygon')}><Square size={18}/> Pindala</button><button aria-pressed={circle} onClick={()=>setMode('Circle')}><Circle size={18}/> Ring</button></div></div>
  <div className="measure-value"><span>{circle?'Raadius':polygon?'Pindala':closedArea!==null?'Ümbermõõt':finished?'Kogupikkus':'Jooksev lõik · hiirekursorini'}</span><output>{result.crossed?'—':circle?lengthLabel(result.radius||0):polygon?areaLabel(result.area):lengthLabel(finished?result.length:Math.max(0,result.length-committedResult.length))}</output>{closedArea!==null&&<div className="measure-circle-area"><span>Suletud ala pindala</span><strong>{areaLabel(closedArea)}</strong><small>{(closedArea/10000).toLocaleString('et-EE',{maximumFractionDigits:4})} ha</small></div>}{!polygon&&!circle&&closedArea===null&&<div className="measure-length-details"><div><span>Kogupikkus</span><strong>{lengthLabel(committedResult.length)}</strong></div><div><span>Viimane lõik</span><strong>{lengthLabel(committedResult.lastSegment||0)}</strong></div></div>}{circle&&<div className="measure-circle-area"><span>Pindala</span><strong>{areaLabel(result.area)}</strong><small>{(result.area/10000).toLocaleString('et-EE',{maximumFractionDigits:4})} ha · Ümbermõõt {lengthLabel(result.length)}</small></div>}{polygon&&<small>{result.crossed?'Piir ristub iseendaga. Võta punkt tagasi või alusta uuesti.':(result.area>0?(result.area/10000).toLocaleString('et-EE',{maximumFractionDigits:4})+' ha · ':'')+'Ümbermõõt '+lengthLabel(result.length)}</small>}</div>
  <p hidden={collapsed}>{finished?'Mõõtmine valmis. Uue mõõtmise alustamiseks vajuta „Uuesti”.':circle?'Puuduta ringi keskpunkti, seejärel soovitud kaugusel ringi serva.':polygon?'Märgi ala piir vähemalt kolme punktiga ja vajuta „Lõpeta”.' :'Märgi joonele vähemalt kaks punkti ja vajuta „Lõpeta”. Ala mõõtmiseks märgi vähemalt kolm punkti ja klõpsa esimest punkti.'}</p>
  <div className="measure-actions">{!finished&&!collapsed&&<button disabled={!result.points} onClick={()=>{if(circle)setRevision(v=>v+1);else draw.current?.removeLastPoint();}} aria-label="Võta viimane mõõtepunkt tagasi"><RotateCcw size={18}/> Tagasi</button>}{(!collapsed||finished)&&<button onClick={()=>setRevision(v=>v+1)}>Uuesti</button>}{!finished&&<button className="primary" disabled={!canFinish} onClick={()=>{if(complete.current)draw.current?.finishDrawing();}}><Check size={18}/> Lõpeta</button>}</div>
  <small hidden={collapsed} className="measure-note">Ajutine mõõtmine · seltsi kaardile ei salvestata.</small>
 </section>;
}
