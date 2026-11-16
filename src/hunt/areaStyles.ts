import type {FeatureLike} from 'ol/Feature.js';
import Polygon from 'ol/geom/Polygon.js';
import LineString from 'ol/geom/LineString.js';
import Point from 'ol/geom/Point.js';
import {Style,Fill,Stroke,Text,Circle as CircleStyle} from 'ol/style.js';
import {measureGeometry} from '../measurement.ts';

export const huntAreaLengthLabel=(metres:number)=>Math.round(metres).toLocaleString('et-EE')+' m';

/**
 * Kaardil olev asi, mille alla külje pikkuse silt ei tohi jääda. Asukoht on kaardi
 * koordinaatides, ulatus ekraanipikslites keskpunktist: left/right külgedele, up üles, down alla.
 */
export type AreaLabelObstacle={coordinate:number[];left:number;right:number;up:number;down:number;/** Kasti keskpunkti nihe ekraanil üles (nimesilt on märgi kohal). */shiftUp?:number};
export type AreaLabelOptions={obstacles?:AreaLabelObstacle[];rotation?:number;text?:string};
/** Kohamärk: ring ja selle kohal olev nimesilt eraldi kastidena, et nende vahele ja kõrvale mahuks teisi silte. */
export const markerObstacles=(coordinate:number[],name=''):AreaLabelObstacle[]=>[
 {coordinate,left:20,right:20,up:20,down:20},
 ...(name?[{coordinate,left:name.length*3.7+5,right:name.length*3.7+5,up:10,down:10,shiftUp:28}]:[])];
/** Küttide vahemaa silt. */
export const distanceLabelObstacle=(coordinate:number[]):AreaLabelObstacle=>({coordinate,left:50,right:50,up:15,down:15});

/**
 * Küttide vahemaa sildi asukoht: joone keskkoha kõrval, mitte joone peal, et silt ei kataks
 * kohamärke ega joont. Silt nihkub `towards` (aju ala keskkoha) poole, kui see on antud.
 */
export function distanceLabelAnchor(a:number[],b:number[],resolution:number,rotation=0,towards?:number[]|null,text='',obstacles:AreaLabelObstacle[]=[]):number[]{
 const middle=[(a[0]+b[0])/2,(a[1]+b[1])/2];
 const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
 if(!length||!Number.isFinite(resolution)||resolution<=0)return middle;
 let nx=-dy/length,ny=dx/length;
 if(towards&&(towards[0]-middle[0])*nx+(towards[1]-middle[1])*ny<0){nx=-nx;ny=-ny;}
 // Sildi kast on ekraanil rõhtne: kui kaugele keskpunkt joonest viia, sõltub joone suunast ekraanil.
 const cos=Math.cos(rotation),sin=Math.sin(rotation);
 const screenX=nx*cos+ny*sin,screenY=ny*cos-nx*sin;
 const halfWidth=(text.length||8)*4.5+9,halfHeight=13;
 const pixels=Math.abs(screenX)*halfWidth+Math.abs(screenY)*halfHeight+10;
 const at=(t:number,side:number)=>[a[0]+dx*t+nx*side*pixels*resolution,a[1]+dy*t+ny*side*pixels*resolution];
 const preferred=at(0.5,1);
 if(!obstacles.length)return preferred;
 // Lühikese joone korral jääb keskkoht kohamärgi või nimesildi alla: proovi nihutada piki joont.
 // Eelistatud on aju ala poolne külg; teisele poole minnakse ainult siis, kui seal on täiesti vaba koht.
 let best=preferred,bestClearance=clearance(preferred,halfWidth,halfHeight,obstacles,resolution,rotation);
 if(bestClearance>=0)return preferred;
 const along=[0.5,0.6,0.4,0.68,0.32,0.76,0.24];
 for(const t of along){
  const point=at(t,1),free=clearance(point,halfWidth,halfHeight,obstacles,resolution,rotation);
  if(free>=0)return point;
  if(free>bestClearance){best=point;bestClearance=free;}
 }
 for(const t of along){const point=at(t,-1);if(clearance(point,halfWidth,halfHeight,obstacles,resolution,rotation)>=0)return point;}
 return best;
}

/** Sildi keskpunkt külje punktist `along` ala sisse nihutatuna; null, kui sisse ei mahu. */
function inward(polygon:Polygon,along:number[],dx:number,dy:number,length:number,resolution:number,startPixels:number):number[]|null{
 // Test both normals: polygon winding and map rotation must not flip labels outwards.
 for(let pixels=startPixels;pixels>=0.2;pixels/=2){
  for(const sign of [1,-1]){
   const distance=pixels*resolution*sign;
   const point=[along[0]-dy/length*distance,along[1]+dx/length*distance];
   if(polygon.intersectsCoordinate(point))return point;
  }
 }
 return null;
}
/** Kui palju silt takistusest vabaks jääb (pikslites); negatiivne tähendab kattumist. */
function clearance(point:number[],halfWidth:number,halfHeight:number,obstacles:AreaLabelObstacle[],resolution:number,rotation:number){
 const cos=Math.cos(rotation),sin=Math.sin(rotation);
 let worst=Infinity;
 for(const obstacle of obstacles){
  const dx=point[0]-obstacle.coordinate[0],dy=point[1]-obstacle.coordinate[1];
  // Kaardi koordinaadid -> ekraan (OpenLayersi vaate pööre on päripäeva positiivne).
  const right=(dx*cos+dy*sin)/resolution,up=(dy*cos-dx*sin)/resolution-(obstacle.shiftUp||0);
  const horizontal=right>=0?right-obstacle.right-halfWidth:-right-obstacle.left-halfWidth;
  const vertical=up>=0?up-obstacle.up-halfHeight:-up-obstacle.down-halfHeight;
  worst=Math.min(worst,Math.max(horizontal,vertical));
 }
 return worst;
}

/**
 * Külje pikkuse sildi asukoht: ala sees, külje lähedal. Vaikimisi külje keskel; kui seal on
 * ees kohamärk, nimesilt või vahemaa silt, nihkub silt piki külge (ja vajadusel sügavamale
 * ala sisse) esimesse vabasse kohta. Kui vaba kohta ei ole, valitakse kõige vähem kattuv.
 */
export function areaLabelAnchor(polygon:Polygon,a:number[],b:number[],resolution:number,options:AreaLabelOptions={}):number[]{
 const middle=[(a[0]+b[0])/2,(a[1]+b[1])/2];
 const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
 if(!length||!Number.isFinite(resolution)||resolution<=0)return middle;
 const obstacles=options.obstacles||[];
 const centre=inward(polygon,middle,dx,dy,length,resolution,28)||middle;
 if(!obstacles.length)return centre;
 const halfWidth=(options.text?.length||7)*4+8,halfHeight=13,rotation=options.rotation||0;
 let best=centre,bestClearance=clearance(centre,halfWidth,halfHeight,obstacles,resolution,rotation);
 if(bestClearance>=0)return centre;
 // Lühikesel küljel ei ole mõtet silti nurka suruda: nihe piki külge on piiratud sildi laiusega.
 const room=length/resolution;
 for(const pixels of [28,54])for(const t of [0.5,0.38,0.62,0.27,0.73,0.17,0.83]){
  if(Math.abs(t-0.5)*room>room/2-halfWidth-6)continue;
  const point=inward(polygon,[a[0]+dx*t,a[1]+dy*t],dx,dy,length,resolution,pixels);
  if(!point)continue;
  const free=clearance(point,halfWidth,halfHeight,obstacles,resolution,rotation);
  if(free>=0)return point;
  if(free>bestClearance){best=point;bestClearance=free;}
 }
 return best;
}

const outline=new Style({fill:new Fill({color:'rgba(249,115,22,.15)'}),stroke:new Stroke({color:'#ea580c',width:3,lineDash:[9,5]}),image:new CircleStyle({radius:5,fill:new Fill({color:'#fff'}),stroke:new Stroke({color:'#ea580c',width:2})})});

// Shared by the live drawing overlay, saved planning area and main hunting map.
export function huntAreaStyles(feature:FeatureLike,resolution=1,options:AreaLabelOptions={}):Style[]{
 const geometry=feature.getGeometry();
 if(!(geometry instanceof Polygon))return [outline];
 const ring=geometry.getCoordinates()[0]||[];
 const labels:Style[]=[];
 const seen=new Set<string>();
 for(let i=1;i<ring.length;i++){
  const a=ring[i-1],b=ring[i];
  if(![...a,...b].every(Number.isFinite))continue;
  // A two-point polygon sketch traverses its only edge in both directions.
  const edge=[a.join(','),b.join(',')].sort().join('|');
  if(seen.has(edge))continue;
  seen.add(edge);
  const length=measureGeometry(new LineString([a,b])).length;
  if(!Number.isFinite(length)||length<0.1)continue;
  const text=huntAreaLengthLabel(length);
  labels.push(new Style({geometry:new Point(areaLabelAnchor(geometry,a,b,resolution,{...options,text})),text:new Text({
   text,font:'bold 13px sans-serif',
   fill:new Fill({color:'#173e32'}),backgroundFill:new Fill({color:'rgba(255,255,255,.96)'}),
   backgroundStroke:new Stroke({color:'#ea580c',width:1}),padding:[4,6,4,6]
  })}));
 }
 return [outline,...labels];
}
