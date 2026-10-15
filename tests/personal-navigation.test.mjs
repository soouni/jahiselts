import test from 'node:test';
import assert from 'node:assert/strict';
import {directionsUrl,readParking,saveParking,clearParking,PARKING_TTL} from '../src/hunt/parking.ts';
function storage(){const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
const fix={coords:[24.2,58.7],accuracy:10,at:10000};
test('directions preserve latitude/longitude ordering and explicit travel mode without sending origin',()=>{
 for(const mode of ['driving','walking']){const url=new URL(directionsUrl(fix.coords,mode));assert.equal(url.origin,'https://www.google.com');assert.equal(url.searchParams.get('destination'),'58.7,24.2');assert.equal(url.searchParams.get('travelmode'),mode);assert.equal(url.searchParams.get('api'),'1');assert.equal(url.searchParams.has('origin'),false);}
 assert.equal(directionsUrl([181,58],'driving'),null);assert.equal(directionsUrl([24,NaN],'walking'),null);
});
test('parking persists across drives but stays account scoped and expires after 48 hours',()=>{
 const store=storage(),spot=saveParking(store,'alice',fix,10000);assert.deepEqual(readParking(store,'alice',10001),spot);assert.equal(readParking(store,'bob',10001),null);
 assert.equal(readParking(store,'alice',10000+PARKING_TTL),null);
 saveParking(store,'alice',fix,10000);clearParking(store,'bob');assert.ok(readParking(store,'alice',10001));clearParking(store,'alice');assert.equal(readParking(store,'alice',10001),null);
});
test('parking refuses stale, future, inaccurate and malformed fixes; failed storage is visible to caller',()=>{
 const store=storage();for(const invalid of [{...fix,at:-30000},{...fix,at:16000},{...fix,accuracy:51},{...fix,accuracy:NaN},{...fix,coords:[24,91]}])assert.throws(()=>saveParking(store,'alice',invalid,10000));
 assert.throws(()=>saveParking(store,'',fix,10000));assert.throws(()=>saveParking({...store,setItem(){throw Error('quota');}},'alice',fix,10000),/quota/);
 store.setItem('parnjoe-parking-v1:alice','{broken');assert.equal(readParking(store,'alice',10000),null);
 store.setItem('parnjoe-parking-v1:alice',JSON.stringify({...saveParking(store,'alice',fix,10000),userId:'bob'}));assert.equal(readParking(store,'alice',10000),null);
});
