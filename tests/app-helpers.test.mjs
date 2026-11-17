import test from 'node:test';
import assert from 'node:assert/strict';
import {composeHuntMarkers} from '../src/hunt/composeMarkers.ts';
import {matchingParticipant} from '../src/hunt/roster.ts';
import {offlineMapMessage} from '../src/offlineSummary.ts';
import {nearestEntryLabel} from '../src/nearest.ts';

const now=Date.parse('2026-11-17T10:00:00Z');
const people=[{id:'a',user_id:'u1',display_name:'Mari Maasikas',role:'hunter'},{id:'b',user_id:null,display_name:'Jaan Tamm',role:'driver'}];
const positions=[{id:'p1',number:1,assigned_participant_id:'a',location:{coordinates:[24.9,58.6]}},{id:'p2',number:2,assigned_participant_id:null,location:{coordinates:[24.91,58.6]}},{id:'p3',number:3,assigned_participant_id:'b',location:null}];

test('hunt markers: placed people with number; unassigned and unplaced positions are skipped',()=>{
 const markers=composeHuntMarkers(people,positions,[],now);
 assert.deepEqual(markers,[{id:'p1',name:'Mari Maasikas · K1',role:'hunter',coordinates:[24.9,58.6]}]);
});
test('live markers: fresh is "praegu", over a minute is stale, over five minutes is dropped',()=>{
 const at=seconds=>new Date(now-seconds*1000).toISOString();
 const live=(id,seconds)=>({participant_id:id,recorded_at:at(seconds),location:{coordinates:[24.95,58.62]}});
 const markers=composeHuntMarkers(people,[],[live('a',10),live('b',90),live('a',301)],now);
 assert.deepEqual(markers.map(m=>[m.id,m.name,m.live,m.stale]),[['live-a','Mari Maasikas · praegu',true,false],['live-b','Jaan Tamm · vana asukoht',true,true]]);
 assert.equal(composeHuntMarkers(people,[],[live('unknown',5)],now).length,0);
});
test('roster match: same account, or same name regardless of spacing and case; never by empty account',()=>{
 assert.equal(matchingParticipant(people,{user_id:'u1',display_name:'Muu Nimi'}).id,'a');
 assert.equal(matchingParticipant(people,{user_id:'u9',display_name:'  jaan   TAMM '}).id,'b');
 assert.equal(matchingParticipant(people,{user_id:'',display_name:'Keegi Teine'}),undefined);
 assert.equal(matchingParticipant([{id:'c',user_id:'',display_name:'X',role:'hunter'}],{user_id:'',display_name:'Y'}),undefined);
});
test('offline map message covers progress, partial, complete, loose tiles and nothing',()=>{
 assert.match(offlineMapMessage({completed:3,failed:1,total:10},null,0),/pooleli: 4\/10/);
 assert.match(offlineMapMessage(null,{name:'Laupäev',completed:8,failed:2,total:10},0),/„Laupäev” on osaline: 8\/10/);
 assert.match(offlineMapMessage(null,{name:'Laupäev',completed:10,failed:0,total:10},0),/on täielik: 10\/10/);
 assert.match(offlineMapMessage(null,null,42),/Salvestatud on 42/);
 assert.equal(offlineMapMessage(null,null,0),'Jahi ala kaardipaketti pole alla laaditud.');
});
test('nearest object: inside an area, near a place, filtered by visible layers, nothing when empty',()=>{
 const entry=(id,kind,geometry,name)=>({id,kind,geometry,properties:{name},created_by:'u',created_at:'',updated_at:'',version:1,deleted_at:null});
 const area=entry('1','area',{type:'Polygon',coordinates:[[[24.89,58.63],[24.91,58.63],[24.91,58.65],[24.89,58.65],[24.89,58.63]]]},'Põld');
 const place=entry('2','place',{type:'Point',coordinates:[24.95,58.64]},'Kuur');
 assert.equal(nearestEntryLabel([24.9,58.64],[area,place],['area','place']),'Asud: Põld');
 const near=nearestEntryLabel([24.9505,58.64],[place],['place']);
 assert.match(near,/^Kuur · umbes \d+ m$/);
 assert.match(nearestEntryLabel([25.2,58.64],[place],['place']),/^Kuur · umbes \d+(\.\d)? km$/);
 assert.equal(nearestEntryLabel([24.9,58.64],[area],['place']),'','hidden layers are ignored');
 assert.equal(nearestEntryLabel([24.9,58.64],[],['area']),'');
});
