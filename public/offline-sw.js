/* Pärnjõe jahikaardi võrguühenduseta kasutamine.
   Salvestatakse vaadatud või kasutaja valitud avalikud Maa- ja Ruumiameti kaardipaanid.
   Supabase'i andmeid ega kasutaja päringuid ei salvestata teenusetöötajaga. */
const SHELL='parnjoe-shell-v2';
const TILES='parnjoe-map-tiles-v1';
const MAX_TILES=2500;
const MAX_PACKAGE_TILES=2499;
const SCOPE=self.registration.scope;
const PACKAGE_META=new URL('offline-package.json',SCOPE).href;
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(SHELL).then(cache=>cache.add(SCOPE)).catch(()=>{}));
 self.skipWaiting();
});
self.addEventListener('activate',event=>{
 event.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('parnjoe-')&&![SHELL,TILES].includes(k)).map(k=>caches.delete(k))))]));
});
async function trim(cache){const keys=await cache.keys();if(keys.length<=MAX_TILES)return;let metadata=null;try{const saved=await cache.match(PACKAGE_META);if(saved)metadata=await saved.json();}catch{}const protectedUrls=new Set(metadata?.urls||[]);const candidates=keys.filter(key=>key.url!==PACKAGE_META&&!protectedUrls.has(key.url));await Promise.all(candidates.slice(0,keys.length-MAX_TILES).map(key=>cache.delete(key)));}
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.hostname==='tiles.maaamet.ee'&&url.pathname.startsWith('/tm/wmts')){
  event.respondWith((async()=>{
   const cache=await caches.open(TILES);
   const saved=await cache.match(req);
   if(saved)return saved;
   try{const response=await fetch(req);if(response.ok){try{await cache.put(req,response.clone());await trim(cache);}catch{}}return response;}
   catch{return new Response('',{status:503,statusText:'Kaardipaani pole salvestatud'});}
  })());return;
 }
 if(url.origin!==self.location.origin||!url.pathname.startsWith(new URL(SCOPE).pathname))return;
 if(req.mode==='navigate'&&![new URL(SCOPE).pathname,new URL('index.html',SCOPE).pathname].includes(url.pathname))return;
 if(req.mode==='navigate'){
  event.respondWith(fetch(req,{cache:'no-cache'}).then(async response=>{if(response.ok){const cache=await caches.open(SHELL);await cache.put(SCOPE,response.clone());}return response;}).catch(async()=>await (await caches.open(SHELL)).match(SCOPE)||Response.error()));return;
 }
 if(/\.(?:geojson|xml)$/.test(url.pathname)){
  event.respondWith((async()=>{const cache=await caches.open(SHELL);try{const response=await fetch(req);if(response.ok){try{await cache.put(req,response.clone());}catch{}return response;}const saved=await cache.match(req);return saved||response;}catch{return await cache.match(req)||Response.error();}})());return;
 }
 if(/\.(?:js|css|svg|png|woff2?|json)$/.test(url.pathname)){
  event.respondWith(caches.open(SHELL).then(async cache=>{
   const saved=await cache.match(req);if(saved)return saved;
   const response=await fetch(req);if(response.ok)try{await cache.put(req,response.clone());}catch{}return response;
  }));
 }
});
self.addEventListener('message',event=>{
 if(event.data?.type==='CACHE_APP_SHELL')event.waitUntil((async()=>{
  const scope=new URL(SCOPE),cache=await caches.open(SHELL);
  const urls=[...new Set(Array.isArray(event.data.urls)?event.data.urls:[])].filter(value=>{try{const url=new URL(value);return url.origin===scope.origin&&url.pathname.startsWith(scope.pathname);}catch{return false;}});
  await Promise.allSettled(urls.map(url=>cache.add(new Request(url,{credentials:'same-origin'}))));
  const required=[SCOPE,...urls];
  const missing=[];for(const url of required){if(!await cache.match(url))missing.push(url);}
  event.source?.postMessage({type:missing.length?'OFFLINE_SHELL_ERROR':'OFFLINE_SHELL_READY',missing:missing.length});
 })().catch(()=>event.source?.postMessage({type:'OFFLINE_SHELL_ERROR'})));
 if(event.data?.type==='CLEAR_OFFLINE_MAP')event.waitUntil(caches.delete(TILES).then(()=>event.source?.postMessage({type:'OFFLINE_MAP_CLEARED'})));
 if(event.data?.type==='CACHE_MAP_PACKAGE')event.waitUntil((async()=>{
  const urls=[...new Set(Array.isArray(event.data.urls)?event.data.urls:[])].filter(value=>{try{return new URL(value).hostname==='tiles.maaamet.ee';}catch{return false;}}).slice(0,MAX_PACKAGE_TILES);
  const cache=await caches.open(TILES);let completed=0,failed=0;
  for(let offset=0;offset<urls.length;offset+=6){
   await Promise.all(urls.slice(offset,offset+6).map(async url=>{try{const request=new Request(url,{mode:'cors'});if(!await cache.match(request)){const response=await fetch(request);if(!response.ok)throw new Error();await cache.put(request,response.clone());}completed++;}catch{failed++;}}));
   event.source?.postMessage({type:'OFFLINE_MAP_PROGRESS',completed,failed,total:urls.length});
  }
  const metadata={name:String(event.data.name||'Jahiala'),base:String(event.data.base||''),completed,failed,total:urls.length,preparedAt:new Date().toISOString(),urls};
  await cache.put(PACKAGE_META,new Response(JSON.stringify(metadata),{headers:{'Content-Type':'application/json'}}));
  await trim(cache);event.source?.postMessage({type:'OFFLINE_MAP_READY',metadata});
 })().catch(()=>event.source?.postMessage({type:'OFFLINE_MAP_ERROR'})));
 if(event.data?.type==='OFFLINE_MAP_STATUS')event.waitUntil((async()=>{const cache=await caches.open(TILES),keys=await cache.keys();let metadata=null;try{const response=await cache.match(PACKAGE_META);if(response)metadata=await response.json();if(metadata?.urls){const present=await Promise.all(metadata.urls.map(url=>cache.match(url)));metadata.completed=present.filter(Boolean).length;metadata.failed=metadata.total-metadata.completed;}}catch{}event.source?.postMessage({type:'OFFLINE_MAP_STATUS',count:keys.filter(key=>key.url!==PACKAGE_META).length,metadata});})());
});
