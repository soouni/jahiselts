import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const originalImage=globalThis.Image;
globalThis.Image=class Image {width=32;height=32;addEventListener(){} removeEventListener(){}};
const {entryMapFeatures,entryMapStyle}=await import('../src/entryMap.ts');
if(originalImage===undefined)delete globalThis.Image;else globalThis.Image=originalImage;
import {symbolUrl} from '../src/placeSymbols.ts';

const entry=(id,kind,type,coordinates)=>({id,kind,geometry:{type,coordinates},properties:{name:id,type:'Jahitorn',color:'#66E0FF',stroke_width:2},deleted_at:null});
test('planning landmarks preserve point symbols, line/area styling and projected positions',()=>{
 const inputs=[entry('Torn','place','Point',[24.9,58.6]),entry('Siht','line','LineString',[[24.9,58.6],[24.91,58.61]]),entry('Mets','area','Polygon',[[[24.9,58.6],[24.91,58.6],[24.91,58.61],[24.9,58.6]]])];
 const features=entryMapFeatures([...inputs,{...inputs[0],id:'deleted',deleted_at:'2026-10-24'}]);
 assert.equal(features.length,3);
 assert.equal(features[0].get('entryId'),'Torn');
 assert.ok(features[0].getGeometry().getCoordinates()[0]>1000000);
 // Icon construction requires the browser's Image class; provide its dimensions only.
 const previous=globalThis.Image;globalThis.Image=class Image {width=32;height=32;};
 try{
  const point=entryMapStyle(features[0],10);
  assert.equal(point.getImage().getSrc(),symbolUrl('Jahitorn'));
  assert.equal(point.getText().getText(),'Torn');
  const line=entryMapStyle(features[1],10);
  assert.equal(line.length,2);assert.equal(line[1].getStroke().getColor(),'#66E0FF');
  assert.equal(line[1].getStroke().getWidth(),2);
  assert.ok(entryMapStyle(features[2],10)[1].getFill());
 }finally{if(previous===undefined)delete globalThis.Image;else globalThis.Image=previous;}
});
test('planning receives the same permission-filtered entries as the main map',()=>{
 const app=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 const planner=readFileSync(new URL('../src/hunt/HuntPlanner.tsx',import.meta.url),'utf8');
 const map=readFileSync(new URL('../src/hunt/HuntPositionMap.tsx',import.meta.url),'utf8');
 assert.match(app,/<HuntPlanner entries=\{visible\}/);
 assert.match(planner,/<HuntPositionMap entries=\{entries\}/);
 assert.match(map,/entriesSource.current.addFeatures\(entryMapFeatures\(entries\)\)/);
 assert.match(map,/source:entriesSource.current,declutter:true,style:/);
});
