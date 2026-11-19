import test from 'node:test';
import assert from 'node:assert/strict';
import {parnjoeSunTimes} from '../src/sunTimes.ts';

test('sun times are ordered through the day',()=>{
 for(const day of ['2026-06-21T10:00:00Z','2026-11-19T08:00:00Z','2026-12-21T08:00:00Z']){
  const t=parnjoeSunTimes(new Date(day));
  const order=[t.twilightStart,t.shootingStart,t.sunrise,t.sunset,t.shootingEnd,t.twilightEnd].map(d=>d.getTime());
  if(day.startsWith('2026-06')){assert.ok(order.some(Number.isNaN)||order.every((v,i)=>i===0||v>=order[i-1]));continue;}
  assert.ok(order.every(v=>!Number.isNaN(v)));
  assert.deepEqual([...order].sort((a,b)=>a-b),order);
 }
});
test('Parnjoe sunrise on 19 Nov 2026 is around 08:00 Tallinn time',()=>{
 const t=parnjoeSunTimes(new Date('2026-11-19T08:00:00Z'));
 const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Tallinn',hour:'2-digit',hour12:false}).format(t.sunrise));
 assert.ok(hour===8||hour===7,'sunrise hour '+hour);
 assert.ok(t.shootingStart<t.sunrise&&t.sunrise-t.shootingStart<90*60000);
});
