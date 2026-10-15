import test from 'node:test';
import assert from 'node:assert/strict';
import {windFlowDegrees,windIsCurrent,windCardinal} from '../src/hunt/wind.ts';
test('wind arrows show flow direction, including rotated map and angle wrap',()=>{
 assert.equal(windFlowDegrees(0),180);assert.equal(windFlowDegrees(90),270);assert.equal(windFlowDegrees(180),0);assert.equal(windFlowDegrees(270),90);
 assert.equal(windFlowDegrees(0,Math.PI/2),270);assert.equal(windFlowDegrees(270,-Math.PI/2),0);assert.equal(windCardinal(164),'S');assert.equal(windCardinal(344),'N');
});
test('missing, expired or invalid weather cannot produce current wind arrows',()=>{
 const reading={speed:1.5,direction:164,time:'2026-10-15T19:45',fetchedAt:10000};
 assert.equal(windIsCurrent(reading,10000),true);assert.equal(windIsCurrent({...reading,speed:0},10000),true);
 for(const invalid of [null,{...reading,speed:-1},{...reading,direction:NaN},{...reading,direction:361},{...reading,fetchedAt:Infinity}])assert.equal(windIsCurrent(invalid,10000),false);
 assert.equal(windIsCurrent(reading,1810000),false);assert.equal(windIsCurrent(reading,0),false);
});
