import LineString from 'ol/geom/LineString.js';
import Polygon from 'ol/geom/Polygon.js';
import {fromCircle} from 'ol/geom/Polygon.js';
import Circle from 'ol/geom/Circle.js';
import {transform} from 'ol/proj.js';
import type {GeometryFunction} from 'ol/interaction/Draw.js';
import type Geometry from 'ol/geom/Geometry.js';

export type Measurement={length:number;lastSegment?:number;area:number;radius?:number;points:number;valid:boolean;crossed:boolean};
// The two chosen points define a true circle in L-EST97. Render its sampled outline
// in the view projection, but calculate area analytically rather than from the polygon.
export const circleGeometry:GeometryFunction=(coordinates,existing,projection)=>{
 const pair=coordinates as number[][],center=pair[0],edge=pair[1]||center;
 const a=transform(center,projection,'EPSG:3301'),b=transform(edge,projection,'EPSG:3301');
 const radius=Math.hypot(b[0]-a[0],b[1]-a[1]);
 const outline=fromCircle(new Circle(a,radius),128).transform('EPSG:3301',projection);
 const polygon=existing instanceof Polygon?existing:new Polygon([]);
 polygon.setProperties({measurementRadius:radius,measurementCenter:center.slice(),measurementEdge:edge.slice()},true);
 polygon.setCoordinates(outline.getCoordinates());return polygon;
};
const same=(a:number[],b:number[])=>Math.hypot(a[0]-b[0],a[1]-b[1])<0.00001;
function crosses(ring:number[][]){
 const turn=(a:number[],b:number[],c:number[])=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const on=(a:number[],b:number[],c:number[])=>Math.abs(turn(a,b,c))<1e-8&&c[0]>=Math.min(a[0],b[0])-1e-8&&c[0]<=Math.max(a[0],b[0])+1e-8&&c[1]>=Math.min(a[1],b[1])-1e-8&&c[1]<=Math.max(a[1],b[1])+1e-8;
 for(let i=0;i<ring.length;i++)for(let j=i+1;j<ring.length;j++){
  if(j===i+1||i===0&&j===ring.length-1)continue;
  const a=ring[i],b=ring[(i+1)%ring.length],c=ring[j],d=ring[(j+1)%ring.length];
  if(turn(a,b,c)*turn(a,b,d)<0&&turn(c,d,a)*turn(c,d,b)<0||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b))return true;
 }
 return false;
}
// Measure in Estonia's metre-based national projection, never directly in Web Mercator.
export function measureGeometry(geometry:Geometry,committedOnly=false):Measurement{
 const radius=geometry.get('measurementRadius');
 if(typeof radius==='number'&&Number.isFinite(radius)&&radius>=0)return {radius,length:2*Math.PI*radius,area:Math.PI*radius*radius,points:radius>0?2:1,valid:radius>0,crossed:false};
 const g=geometry.clone().transform('EPSG:3857','EPSG:3301');
 const polygon=g instanceof Polygon;
 let coords=polygon?g.getCoordinates()[0]||[]:g instanceof LineString?g.getCoordinates():[];
 if(polygon)coords=coords.slice(0,-1);
 if(committedOnly)coords=coords.slice(0,-1); // OpenLayers' last sketch vertex follows the pointer.
 coords=coords.filter((p,i)=>!i||!same(p,coords[i-1]));
 if(polygon&&coords.length>1&&same(coords[0],coords[coords.length-1]))coords.pop();
 const points=coords.length;
 if(!coords.every(c=>c.every(Number.isFinite)))return {length:0,area:0,points,valid:false,crossed:false};
 const ring=polygon&&points?[...coords,coords[0]]:coords;
 const length=points>1?new LineString(ring).getLength():0;
 const crossed=polygon&&points>=3&&crosses(coords);
 const area=polygon&&points>=3&&!crossed?new Polygon([ring]).getArea():0;
 const lastSegment=!polygon&&points>1?new LineString(coords.slice(-2)).getLength():0;
 return {length,lastSegment,area,points,crossed,valid:polygon?points>=3&&area>0&&!crossed:points>=2&&length>0};
}
const number=(n:number,digits=1)=>n.toLocaleString('et-EE',{maximumFractionDigits:digits});
export const lengthLabel=(metres:number)=>metres>=1000?number(metres/1000,2)+' km':number(metres)+' m';
export const areaLabel=(squareMetres:number)=>squareMetres>=1000000?number(squareMetres/1000000,2)+' km²':squareMetres>=10000?number(squareMetres/10000,2)+' ha':number(squareMetres)+' m²';
