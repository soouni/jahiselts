import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const worker=readFileSync(new URL('../public/offline-sw.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');

test('first successful visit sends the loaded app shell to the service worker',()=>{
 assert.match(app,/performance\.getEntriesByType\('resource'\)/);
 assert.match(app,/type:'CACHE_APP_SHELL'/);
 assert.match(worker,/type==='CACHE_APP_SHELL'/);
 assert.match(worker,/Promise\.allSettled\(urls\.map\(url=>cache\.add/);
 assert.match(worker,/type:'OFFLINE_SHELL_READY'/);
});

test('offline cache accepts only same-origin resources inside its scope',()=>{
 assert.match(worker,/url\.origin===scope\.origin&&url\.pathname\.startsWith\(scope\.pathname\)/);
 assert.doesNotMatch(worker,/supabase[^\n]*cache\.put/i);
});

test('map tile storage is bounded, package status is explicit and navigation has an offline fallback',()=>{
 assert.match(worker,/const MAX_TILES=2500/);
 assert.match(worker,/keys\.slice\(0,keys\.length-MAX_TILES\)/);
 assert.match(worker,/req\.mode==='navigate'/);
 assert.match(worker,/match\(SCOPE\)\|\|Response\.error\(\)/);
 assert.match(worker,/type==='CACHE_MAP_PACKAGE'/);
 assert.match(worker,/OFFLINE_MAP_PROGRESS/);
 assert.match(worker,/OFFLINE_MAP_READY/);
 assert.match(worker,/preparedAt:new Date\(\)\.toISOString\(\)/);
});
