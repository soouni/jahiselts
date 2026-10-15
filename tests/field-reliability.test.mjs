import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {gpsUsable,canConfirmGps,createRefreshRunner} from '../src/hunt/reliability.ts';
import {readLastOfflinePosition,readOfflinePosition,saveOfflinePosition,clearOfflinePosition,OFFLINE_POSITION_TTL} from '../src/hunt/offlinePosition.ts';

test('GPS confirmation rejects stopped, old, inaccurate and invalid fixes',()=>{
 const now=100000,fix={coords:[24,58],accuracy:15,at:now};
 assert.equal(canConfirmGps(fix,true,now),true);
 for(const candidate of [{...fix,at:now-30001},{...fix,at:now+5001},{...fix,accuracy:51},{...fix,accuracy:NaN},{...fix,coords:[200,58]}])assert.equal(canConfirmGps(candidate,true,now),false);
 assert.equal(canConfirmGps(fix,false,now),false);
 assert.equal(gpsUsable({...fix,accuracy:80},true,now),true,'low accuracy can guide with a warning but cannot confirm');
});
test('sync success waits for completed loading; failure preserves last successful timestamp',async()=>{
 let resolve,loads=0,success=0,failure=0;
 const runner=createRefreshRunner(()=>{loads++;return new Promise(r=>resolve=r);},()=>success++,()=>failure++);
 const first=runner.run();assert.equal(success,0);await runner.run();assert.equal(loads,1);
 resolve();await new Promise(r=>setImmediate(r));assert.equal(success,1);assert.equal(loads,2);resolve();await first;assert.equal(success,2);
 runner.dispose();await runner.run();assert.equal(loads,2);
 const broken=createRefreshRunner(async()=>{throw Error('network');},()=>success++,()=>failure++);await broken.run();assert.equal(success,2);assert.equal(failure,1);
});
test('disposed sync request cannot report success for another hunt or account',async()=>{
 let resolve,success=0;const runner=createRefreshRunner(()=>new Promise(r=>resolve=r),()=>success++,()=>{});const request=runner.run();runner.dispose();resolve();await request;assert.equal(success,0);
});
test('offline own position is account scoped, expires, and never stores extra participant data',()=>{
 const map=new Map(),store={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const data={userId:'a',huntId:'h',driveId:'d',title:'Jaht',number:1,coordinates:[24,58],base:'hybriid',otherParticipants:[{name:'private'}]};
 saveOfflinePosition(store,data,1000);assert.equal(readOfflinePosition(store,'b',1000),null);
 assert.deepEqual(readOfflinePosition(store,'a',1000).coordinates,[24,58]);assert.equal([...map.values()][0].includes('private'),false);assert.equal(readLastOfflinePosition(store,1000)?.userId,'a');
 assert.equal(readOfflinePosition(store,'a',1000+OFFLINE_POSITION_TTL),null);assert.equal(readLastOfflinePosition(store,1000+OFFLINE_POSITION_TTL),null);
 saveOfflinePosition(store,data,2000);clearOfflinePosition(store,'a');assert.equal(map.size,0);
 map.set('parnjoe-own-position-v1:a','{broken');assert.equal(readOfflinePosition(store,'a'),null);
});
function workerFixture(failUrls=[]){
 const handlers={},messages=[],entries=new Map();const scope='https://example.test/jahiselts/';
 const key=x=>typeof x==='string'?x:x.url;
 const cache={add:async r=>{if(failUrls.includes(key(r)))throw Error('offline');entries.set(key(r),new Response('ok'));},match:async r=>entries.get(key(r))?.clone(),put:async(r,v)=>entries.set(key(r),v),keys:async()=>[...entries.keys()].map(url=>({url})),delete:async r=>entries.delete(key(r))};
 const context={self:{registration:{scope},location:{origin:'https://example.test'},addEventListener:(n,f)=>handlers[n]=f,skipWaiting(){}},URL,Request,Response,Set,Promise,caches:{open:async()=>cache},fetch:async()=>{throw Error('offline');}};
 vm.runInNewContext(readFileSync(new URL('../public/offline-sw.js',import.meta.url),'utf8'),context);
 return {scope,cache,entries,messages,context,async navigate(url){let result;handlers.fetch({request:{url,method:'GET',mode:'navigate'},respondWith:p=>result=p});return result?await result:null;},async message(data){let wait;handlers.message({data,source:{postMessage:m=>messages.push(m)},waitUntil:p=>wait=p});await wait;},async fetch(url){let result;handlers.fetch({request:new Request(url),respondWith:p=>result=p});return result?await result:null;}};
}
test('offline shell cannot report ready when mandatory assets are missing',async()=>{
 const url='https://example.test/jahiselts/assets/app.js',w=workerFixture([url]);await w.cache.add(w.scope);await w.message({type:'CACHE_APP_SHELL',urls:[url]});assert.equal(w.messages.at(-1).type,'OFFLINE_SHELL_ERROR');
 const good=workerFixture();await good.cache.add(good.scope);await good.message({type:'CACHE_APP_SHELL',urls:[url,'https://foreign.test/secret']});assert.equal(good.messages.at(-1).type,'OFFLINE_SHELL_READY');assert.equal(good.entries.has('https://foreign.test/secret'),false);
});
test('offline map configuration and boundary are served from cache after restart',async()=>{
 const w=workerFixture();for(const path of ['data/wmts.xml','data/boundary.geojson']){const url=w.scope+path;await w.cache.put(url,new Response(path));assert.equal(await (await w.fetch(url)).text(),path);}
});
test('package status detects evicted or missing tiles rather than trusting old totals',async()=>{
 const w=workerFixture(),url='https://tiles.maaamet.ee/tm/wmts/test';await w.cache.put(w.scope+'offline-package.json',new Response(JSON.stringify({completed:1,failed:0,total:1,urls:[url]})));await w.message({type:'OFFLINE_MAP_STATUS'});assert.equal(w.messages.at(-1).metadata.completed,0);assert.equal(w.messages.at(-1).metadata.failed,1);
});

test('visiting QA tooling cannot overwrite the offline application entry page',async()=>{
 const w=workerFixture();await w.cache.put(w.scope,new Response('APP'));assert.equal(await w.navigate(w.scope+'qa/layout.html'),null);assert.equal(await (await w.cache.match(w.scope)).text(),'APP');assert.equal(await (await w.navigate(w.scope)).text(),'APP');
});
test('storage failure reports download error instead of leaving progress running',async()=>{
 const w=workerFixture();w.cache.put=async()=>{throw Error('quota');};await w.message({type:'CACHE_MAP_PACKAGE',urls:['https://tiles.maaamet.ee/tm/wmts/test']});assert.equal(w.messages.at(-1).type,'OFFLINE_MAP_ERROR');
});
test('cache quota failure does not hide a successfully fetched map tile',async()=>{
 const w=workerFixture();w.context.fetch=async()=>new Response('TILE');w.cache.put=async()=>{throw Error('quota');};assert.equal(await (await w.fetch('https://tiles.maaamet.ee/tm/wmts/test')).text(),'TILE');
});
test('later map browsing cannot evict the selected offline package',async()=>{
 const w=workerFixture(),tile='https://tiles.maaamet.ee/tm/wmts/protected';await w.cache.put(tile,new Response('saved'));await w.cache.put(w.scope+'offline-package.json',new Response(JSON.stringify({urls:[tile],total:1})));for(let i=0;i<2500;i++)await w.cache.put('https://tiles.maaamet.ee/tm/wmts/old'+i,new Response('old'));
 w.context.fetch=async()=>new Response('new');await w.fetch('https://tiles.maaamet.ee/tm/wmts/new');assert.ok(await w.cache.match(tile));assert.ok(await w.cache.match(w.scope+'offline-package.json'));assert.ok(w.entries.size<=2500);
});

test('online application navigation revalidates HTML instead of reusing an old HTTP cache entry',async()=>{
 const w=workerFixture();let policy;w.context.fetch=async(_request,options)=>{policy=options?.cache;return new Response('NEW APP');};assert.equal(await (await w.navigate(w.scope)).text(),'NEW APP');assert.equal(policy,'no-cache');
});
