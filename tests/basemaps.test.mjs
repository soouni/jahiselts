import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DOMParser} from '@xmldom/xmldom';
import WMTSCapabilities from 'ol/format/WMTSCapabilities.js';
import WMTS,{optionsFromCapabilities} from 'ol/source/WMTS.js';
import {fromLonLat,get as getProjection} from 'ol/proj.js';
import {createBasemapSource} from '../src/basemaps.ts';

globalThis.DOMParser=DOMParser;
globalThis.Node={ELEMENT_NODE:1,TEXT_NODE:3,CDATA_SECTION_NODE:4,DOCUMENT_NODE:9};
const xml=fs.readFileSync(new URL('../public/data/wmts.xml',import.meta.url),'utf8');
const read=()=>{
 const doc=new DOMParser().parseFromString(xml,'text/xml');
 // xmldom supplies XML DOM Core; OpenLayers additionally uses these two
 // standard Element traversal properties, which browsers provide natively.
 for(const node of Array.from(doc.getElementsByTagName('*')))Object.defineProperties(node,{
  firstElementChild:{get(){for(let c=this.firstChild;c;c=c.nextSibling)if(c.nodeType===1)return c;return null;}},
  nextElementSibling:{get(){for(let c=this.nextSibling;c;c=c.nextSibling)if(c.nodeType===1)return c;return null;}}
 });
 return new WMTSCapabilities().read(doc);
};
const projection=getProjection('EPSG:3857');
const center=fromLonLat([24.887,58.638]);

test('reproduces blank map: advertised GMC tile limits exclude Pärnjõe',()=>{
 const original=new WMTS(optionsFromCapabilities(read(),{layer:'foto',matrixSet:'GMC',requestEncoding:'KVP'}));
 const coord=original.getTileGrid().getTileCoordForCoordAndZ(center,11);
 assert.deepEqual(coord,[11,1165,609]);
 assert.equal(original.getTileCoordForTileUrlFunction(coord,projection),null);
});

test('official matrix with geographic coverage permits tiles over the entire hunting boundary',()=>{
 const boundary=JSON.parse(fs.readFileSync(new URL('../public/data/boundary.geojson',import.meta.url)));
 for(const name of ['kaart','foto','hybriid']){
  const source=createBasemapSource(read(),name),grid=source.getTileGrid();
  for(const p of boundary.features[0].geometry.coordinates[0]){
   for(const z of [8,11,14,17]){
    const coord=grid.getTileCoordForCoordAndZ(fromLonLat(p),z);
    assert.deepEqual(source.getTileCoordForTileUrlFunction(coord,projection),coord);
   }
  }
 }
});

for(const name of ['kaart','foto','hybriid'])test(`real ${name} tile from the application URL returns a browser-readable image`,{skip:process.env.LIVE_MAP_TESTS!=='1'},async()=>{
 const source=createBasemapSource(read(),name),grid=source.getTileGrid();
 const coord=source.getTileCoordForTileUrlFunction(grid.getTileCoordForCoordAndZ(center,11),projection);
 const url=source.getTileUrlFunction()(coord,1,projection);
 assert.ok(url);
 const parsed=new URL(url);
 assert.equal(parsed.searchParams.get('ASUTUS'),'PARNJOE_JAHISELTS');
 const r=await fetch(url,{headers:{Origin:'https://parnjoe-jahikaart.ojamaa.chatgpt.site'},signal:AbortSignal.timeout(20000)});
 assert.equal(r.status,200);
 assert.equal(r.headers.get('access-control-allow-origin'),'*');
 assert.equal(r.headers.get('content-type'),name==='foto'?'image/jpeg':'image/png');
 const bytes=Buffer.from(await r.arrayBuffer());
 assert.ok(bytes.length>1000);
 if(name==='foto')assert.equal(bytes.subarray(0,2).toString('hex'),'ffd8');
 else assert.equal(bytes.subarray(1,4).toString(),'PNG');
});
