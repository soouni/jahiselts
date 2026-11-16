import test from 'node:test';
import assert from 'node:assert/strict';
import {lineNeighbours} from '../src/guest/neighbours.ts';

// Ristkülikukujuline aju: lääneserv 24.880, idaserv 24.900, lõunaserv 58.630, põhjaserv 58.640.
const area={type:'Polygon',coordinates:[[[24.88,58.63],[24.90,58.63],[24.90,58.64],[24.88,58.64],[24.88,58.63]]]};
// Paigutus nagu omaniku ekraanipildil 16.11.2026: liin kulgeb mööda lääneserva üles ja mööda põhjaserva itta.
// Numbrid EI ole liini järjekorras (K2 on otsas, K1 tema kõrval).
const k1={id:'asko',coordinates:[24.8800,58.6360]},k2={id:'andrus',coordinates:[24.8800,58.6340]};
const k3={id:'aadu',coordinates:[24.8835,58.6400]},k5={id:'elmar',coordinates:[24.8910,58.6400]};
const line=[k1,k2,k3,k5];
const ids=result=>({left:result.left?.id??null,right:result.right?.id??null});

test('the hunter at the end of the line gets one neighbour and an open end, not the two nearest hunters',()=>{
 const result=lineNeighbours(line,'andrus',area);
 // Ahela suund on suvaline; oluline on järjestus otsast otsani.
 assert.ok(['andrus>asko>aadu>elmar','elmar>aadu>asko>andrus'].includes(result.order.join('>')),result.order.join('>'));
 assert.equal(result.closed,false);assert.equal(result.sided,true);
 // Andrus vaatab itta (aju poole): põhjas seisev Asko on vasakul, paremal on liini ots.
 assert.deepEqual(ids(result),{left:'asko',right:null});
 assert.ok(result.left.meters>200&&result.left.meters<240,'distance to the real neighbour, about 223 m');
});
test('hunters in the middle get the adjacent hunter on each hand, also around the corner of the line',()=>{
 // Asko vaatab itta: Aadu (põhjas) vasakul, Andrus (lõunas) paremal.
 assert.deepEqual(ids(lineNeighbours(line,'asko',area)),{left:'aadu',right:'andrus'});
 // Aadu seisab põhjaserval ja vaatab lõunasse: idas seisev Elmar on vasakul, läänes-lõunas Asko paremal.
 assert.deepEqual(ids(lineNeighbours(line,'aadu',area)),{left:'elmar',right:'asko'});
 assert.deepEqual(ids(lineNeighbours(line,'elmar',area)),{left:null,right:'aadu'});
});
test('the far end of an open line is never reported as a neighbour',()=>{
 for(const hunter of line){const result=lineNeighbours(line,hunter.id,area);assert.equal(result.closed,false);}
 const andrus=lineNeighbours(line,'andrus',area);
 assert.notEqual(andrus.left?.id,'elmar');assert.notEqual(andrus.right?.id,'elmar');
});
test('input order and position numbers do not matter',()=>{
 const shuffled=[k5,k2,k3,k1];
 for(const hunter of line)assert.deepEqual(ids(lineNeighbours(shuffled,hunter.id,area)),ids(lineNeighbours(line,hunter.id,area)));
});
test('a line that surrounds the drive is a ring: everyone has two neighbours',()=>{
 const ring=[
  {id:'n',coordinates:[24.890,58.6405]},{id:'ne',coordinates:[24.9005,58.6385]},{id:'se',coordinates:[24.9005,58.6315]},
  {id:'s',coordinates:[24.890,58.6295]},{id:'sw',coordinates:[24.8795,58.6315]},{id:'nw',coordinates:[24.8795,58.6385]}];
 for(const hunter of ring){
  const result=lineNeighbours(ring,hunter.id,area);
  assert.equal(result.closed,true);assert.ok(result.left&&result.right,hunter.id+' has a neighbour on both hands');
 }
 // Põhjas seisja vaatab lõunasse: ida on vasakul, lääs paremal.
 assert.deepEqual(ids(lineNeighbours(ring,'n',area)),{left:'ne',right:'nw'});
});
test('two hunters, a lone hunter, an unknown hunter and a missing drive area',()=>{
 assert.deepEqual(ids(lineNeighbours([k1,k2],'andrus',area)),{left:'asko',right:null});
 assert.equal(lineNeighbours([k2],'andrus',area),null);
 assert.equal(lineNeighbours(line,'puudub',area),null);
 const unsided=lineNeighbours(line,'asko',null);
 assert.equal(unsided.sided,false);assert.deepEqual([unsided.left.id,unsided.right.id].sort(),['aadu','andrus']);
 const end=lineNeighbours(line,'andrus',null);
 assert.equal(end.sided,false);assert.deepEqual([end.left?.id??null,end.right?.id??null],['asko',null]);
});
