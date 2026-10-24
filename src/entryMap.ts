import type {FeatureLike} from 'ol/Feature.js';
import Feature from 'ol/Feature.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import {Fill,Stroke,Style,Circle as CircleStyle,Text,Icon} from 'ol/style.js';
import {isWaterSymbol,placeSymbolSize,placeTypes,symbolType,symbolUrl} from './placeSymbols.ts';
import {mapColor,colorOutline,mapWidth} from './mapColors.ts';
import type {Entry,Kind} from './types.ts';
import {label} from './types.ts';
const pointIcons=Object.fromEntries(placeTypes.map(t=>[t,new Icon({src:symbolUrl(t),declutterMode:isWaterSymbol(t)?'obstacle':undefined,width:placeSymbolSize(t),height:placeSymbolSize(t)})]));
const selectedPointIcons=Object.fromEntries(placeTypes.map(t=>[t,new Icon({src:symbolUrl(t),declutterMode:isWaterSymbol(t)?'obstacle':undefined,width:placeSymbolSize(t,true),height:placeSymbolSize(t,true)})]));

export function entryMapStyle(f:FeatureLike,res:number,selectedEntryId?:string){
 const kind=f.get('kind') as Kind,color=mapColor(kind,f.get('color')),named=kind==='area'||kind==='line';
 const width=mapWidth(kind,f.get('stroke_width')),house=kind==='place';
 const selected=f.get('entryId')===selectedEntryId,type=symbolType(f.get('objectType'));
 const size=placeSymbolSize(type,selected);
 const mainStyle=new Style({zIndex:selected?2:0,stroke:new Stroke({color,width,lineDash:kind==='sign'?[6,4]:undefined}),fill:new Fill({color:kind==='area'?color+'20':'rgba(124,72,148,.08)'}),image:house?(selected?selectedPointIcons[type]:pointIcons[type]):new CircleStyle({radius:kind==='observation'?8:7,fill:new Fill({color}),stroke:new Stroke({color:'#fff',width:2})}),text:res<18?new Text({text:(kind==='sign'?'↟ ':kind==='observation'?'◉ ':'')+f.get('label'),offsetY:house?-(size/2+8):-18,font:'600 14px system-ui',fill:new Fill({color:'#162f28'}),stroke:new Stroke({color:'#fff',width:4})}):undefined});
 return named?[new Style({stroke:new Stroke({color:colorOutline(color),width:width+3})}),mainStyle]:mainStyle;
}
const format=new GeoJSON();
export function entryMapFeatures(entries:Entry[]):Feature[]{
 return entries.filter(e=>!e.deleted_at).map(e=>format.readFeature({type:'Feature',geometry:e.geometry,properties:{kind:e.kind,objectType:e.properties.type,label:label(e),entryId:e.id,color:mapColor(e.kind,e.properties.color),stroke_width:mapWidth(e.kind,e.properties.stroke_width)}},{dataProjection:'EPSG:4326',featureProjection:'EPSG:3857'}) as Feature);
}
