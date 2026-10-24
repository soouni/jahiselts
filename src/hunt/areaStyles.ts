import type {FeatureLike} from 'ol/Feature.js';
import Polygon from 'ol/geom/Polygon.js';
import LineString from 'ol/geom/LineString.js';
import Point from 'ol/geom/Point.js';
import {Style,Fill,Stroke,Text,Circle as CircleStyle} from 'ol/style.js';
import {measureGeometry,lengthLabel} from '../measurement.ts';

const outline=new Style({fill:new Fill({color:'rgba(249,115,22,.15)'}),stroke:new Stroke({color:'#ea580c',width:3,lineDash:[9,5]}),image:new CircleStyle({radius:5,fill:new Fill({color:'#fff'}),stroke:new Stroke({color:'#ea580c',width:2})})});

// Shared by the live drawing overlay, saved planning area and main hunting map.
export function huntAreaStyles(feature:FeatureLike):Style[]{
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
  labels.push(new Style({geometry:new Point([(a[0]+b[0])/2,(a[1]+b[1])/2]),text:new Text({
   text:lengthLabel(length),font:'bold 13px sans-serif',offsetY:-12,
   fill:new Fill({color:'#173e32'}),backgroundFill:new Fill({color:'rgba(255,255,255,.96)'}),
   backgroundStroke:new Stroke({color:'#ea580c',width:1}),padding:[4,6,4,6]
  })}));
 }
 return [outline,...labels];
}
