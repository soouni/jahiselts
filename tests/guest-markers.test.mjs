import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compassWord} from '../src/guest/session.ts';

const map=readFileSync(new URL('../src/Map.tsx',import.meta.url),'utf8');
const guest=readFileSync(new URL('../src/guest/GuestHunt.tsx',import.meta.url),'utf8');
const luminance=hex=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(x=>x<=.03928?x/12.92:((x+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
const contrast=(a,b)=>{const [hi,lo]=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (hi+.05)/(lo+.05);};

test('driver and hunter markers differ by shape, not only by colour',()=>{
 // Roheline ja pruun on peaaegu sama heledad: ainult värvi järgi on need värvipimedale eristamatud.
 assert.ok(contrast('#176c52','#8a5a14')<1.5,'the colours alone are not distinguishable, so shape must carry the difference');
 assert.match(map,/driver\?new RegularShape\(\{points:4/,'drivers are squares');
 assert.match(map,/:new CircleStyle\(\{radius:isMine\?18:16/,'hunters stay circles');
 assert.ok(!/image:new CircleStyle\(\{radius:isMine\?18:16,declutterMode:'none',fill:new Fill\(\{color:isMine/.test(map),'the old colour-only marker is gone');
});
test('own-place marker has a dark border that reaches 3:1 against its fill, hunter and driver fills reach 3:1 against the white border',()=>{
 assert.ok(contrast('#f2b544','#173e32')>=3);
 assert.ok(contrast('#176c52','#ffffff')>=3);assert.ok(contrast('#8a5a14','#ffffff')>=3);
 assert.match(map,/color:isMine\?'#173e32':'#fff'/);
});
test('compass words give the direction without degrees',()=>{
 assert.equal(compassWord(0),'põhja suunas');assert.equal(compassWord(44),'kirde suunas');assert.equal(compassWord(90),'ida suunas');
 assert.equal(compassWord(135),'kagu suunas');assert.equal(compassWord(180),'lõuna suunas');assert.equal(compassWord(225),'edela suunas');
 assert.equal(compassWord(270),'lääne suunas');assert.equal(compassWord(315),'loode suunas');assert.equal(compassWord(359),'põhja suunas');assert.equal(compassWord(-90),'lääne suunas');
});
test('guest copy: grammatical line-end text, plain words, no degrees',()=>{
 assert.match(guest,/pole kedagi, oled liini otsas/);assert.doesNotMatch(guest,/kedagi, oled kütiliini/);
 assert.match(guest,/Salvesta kaart/);assert.doesNotMatch(guest,/'Võrguta'/);
 assert.match(guest,/Kaart ei asenda jahijuhi ohutusjuhiseid/);assert.doesNotMatch(guest,/Kaardipunkt|kaardipaan|ohutuskorraldus|° põhjast/);
});
