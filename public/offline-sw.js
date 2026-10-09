/* Pärnjõe jahikaardi võrguühenduseta kasutamise esimene etapp.
   Salvestatakse ainult juba vaadatud avalikud Maa- ja Ruumiameti kaardipaanid.
   Supabase'i andmeid ega kasutaja päringuid ei salvestata teenusetöötajaga. */
const SHELL='parnjoe-shell-v1';
const TILES='parnjoe-map-tiles-v1';
const MAX_TILES=450;
const SCOPE=self.registration.scope;
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(SHELL).then(cache=>cache.add(SCOPE)).catch(()=>{}));
 self.skipWaiting();
});
self.addEventListener('activate',event=>{
 event.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('parnjoe-')&&![SHELL,TILES].includes(k)).map(k=>caches.delete(k))))]));
});
async function trim(cache){const keys=await cache.keys();if(keys.length>MAX_TILES)await Promise.all(keys.slice(0,keys.length-MAX_TILES).map(key=>cache.delete(key)));}
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.hostname==='tiles.maaamet.ee'&&url.pathname.startsWith('/tm/wmts')){
  event.respondWith((async()=>{
   const cache=await caches.open(TILES);
   const saved=await cache.match(req);
   if(saved)return saved;
   try{const response=await fetch(req);if(response.ok){await cache.put(req,response.clone());await trim(cache);}return response;}
   catch{return new Response('',{status:503,statusText:'Kaardipaani pole salvestatud'});}
  })());return;
 }
 if(url.origin!==self.location.origin||!url.pathname.startsWith(new URL(SCOPE).pathname))return;
 if(req.mode==='navigate'){
  event.respondWith(fetch(req).then(async response=>{if(response.ok){const cache=await caches.open(SHELL);await cache.put(SCOPE,response.clone());}return response;}).catch(async()=>await (await caches.open(SHELL)).match(SCOPE)||Response.error()));return;
 }
 if(/\.(?:js|css|svg|png|woff2?)$/.test(url.pathname)){
  event.respondWith(caches.open(SHELL).then(async cache=>{
   const saved=await cache.match(req);if(saved)return saved;
   const response=await fetch(req);if(response.ok)await cache.put(req,response.clone());return response;
  }));
 }
});
self.addEventListener('message',event=>{
 if(event.data?.type==='CLEAR_OFFLINE_MAP')event.waitUntil(caches.delete(TILES).then(()=>event.source?.postMessage({type:'OFFLINE_MAP_CLEARED'})));
 if(event.data?.type==='OFFLINE_MAP_STATUS')event.waitUntil(caches.open(TILES).then(cache=>cache.keys()).then(keys=>event.source?.postMessage({type:'OFFLINE_MAP_STATUS',count:keys.length})));
});
