import test from 'node:test';
import assert from 'node:assert/strict';
import {distanceAndBearing,normalizedHeading,relativeBearing} from '../src/hunt/navigation.ts';

test('GPS distance and bearing are stable for cardinal directions',()=>{
 const north=distanceAndBearing([24,58],[24,58.001]);
 assert.ok(north&&Math.abs(north.meters-111.2)<0.5);
 assert.ok(north&&Math.min(north.bearing,360-north.bearing)<0.01);
 const east=distanceAndBearing([24,58],[24.001,58]);
 assert.ok(east&&Math.abs(east.meters-58.9)<0.5);
 assert.ok(east&&Math.abs(east.bearing-90)<0.01);
 assert.equal(distanceAndBearing([Number.NaN,58],[24,58]),null);
});

test('iOS and absolute orientation readings produce normalized headings',()=>{
 assert.equal(normalizedHeading({webkitCompassHeading:370}),10);
 assert.equal(normalizedHeading({alpha:90,absolute:true}),270);
 assert.equal(normalizedHeading({alpha:90,absolute:false}),null);
 assert.equal(normalizedHeading({alpha:null,absolute:true}),null);
});

test('target bearing rotates relative to phone heading',()=>{
 assert.equal(relativeBearing(10,350),20);
 assert.equal(relativeBearing(350,10),340);
 assert.equal(relativeBearing(90,null),90);
});
