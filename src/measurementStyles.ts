import type {FeatureLike} from 'ol/Feature.js';
import LineString from 'ol/geom/LineString.js';
import Polygon from 'ol/geom/Polygon.js';
import Point from 'ol/geom/Point.js';
import {Style,Stroke,Fill,Text,Circle as CircleStyle} from 'ol/style.js';
import {measureGeometry,lengthLabel} from './measurement.ts';

const style=[new Style({stroke:new Stroke({color:'#18372d',width:7})}),new Style({stroke:new Stroke({color:'#ffe066',width:4}),fill:new Fill({color:'rgba(255,224,102,.15)'}),image:new CircleStyle({radius:6,fill:new Fill({color:'#ffe066'}),stroke:new Stroke({color:'#18372d',width:2})})})];
// Lõigupikkused kuvatakse kaardil; sildid jäävad nähtavaks kuni mõõtmise sulgemiseni.
export function measurementStyles(feature:FeatureLike):Style[]{
 const geom=feature.getGeometry();
 // A circle is drawn as a sampled polygon, but its edges are not user segments.
 const radius=geom?.get('measurementRadius');
 if(typeof radius==='number'&&Number.isFinite(radius)&&radius>=0)return style;
 if(!(geom instanceof LineString)&&!(geom instanceof Polygon))return style;
 const coords=geom instanceof Polygon?geom.getCoordinates()[0]:geom.getCoordinates();
 const labels:Style[]=[];
 for(let i=1;i<coords.length;i++){
  const a=coords[i-1],b=coords[i];
  if(Math.hypot(b[0]-a[0],b[1]-a[1])<0.01)continue;
  const length=measureGeometry(new LineString([a,b])).length;
  labels.push(new Style({geometry:new Point([(a[0]+b[0])/2,(a[1]+b[1])/2]),text:new Text({
   text:lengthLabel(length),font:'bold 13px sans-serif',offsetY:-14,
   fill:new Fill({color:'#173e32'}),backgroundFill:new Fill({color:'rgba(255,255,255,0.94)'}),
   backgroundStroke:new Stroke({color:'#d2ddd6',width:1}),padding:[4,6,4,6]
  })}));
 }
 return [...style,...labels];
}

