import test from 'node:test';
import assert from 'node:assert/strict';
import {huntPersonName,readNameDisplay,saveNameDisplay} from '../src/hunt/nameDisplay.ts';
const rain={id:'1',display_name:'Rain Raudsepp'},other={id:'2',display_name:'Rain Ojamaa'},martti={id:'3',display_name:'Martti Ojamaa'};
test('personal name display uses full names or first names with duplicate initials',()=>{
 const people=[rain,other,martti];
 assert.equal(huntPersonName(rain,people,'full'),'Rain Raudsepp');
 assert.equal(huntPersonName(rain,people,'first'),'Rain R.');
 assert.equal(huntPersonName(other,people,'first'),'Rain O.');
 assert.equal(huntPersonName(martti,people,'first'),'Martti');
 assert.equal(huntPersonName(rain,[rain,rain],'first'),'Rain','same person is not a duplicate');
 assert.equal(huntPersonName(rain,[rain],'first'),'Rain','removed participant no longer triggers an initial');
 assert.equal(huntPersonName(rain,[rain,{id:'4',display_name:' rain   Õun '}],'first'),'Rain R.');
 assert.equal(huntPersonName({id:'4',display_name:' Rain   Õun '},[rain],'first'),'Rain Õ.');
 assert.equal(huntPersonName({id:'5',display_name:'Rain'},people,'first'),'Rain');
 assert.equal(huntPersonName({id:'5',display_name:''},people,'first'),'Nimeta');
});
test('name preferences remain isolated between accounts and survive reload',()=>{
 const data=new Map();const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
 assert.equal(readNameDisplay(storage,'a'),'full');
 assert.equal(saveNameDisplay(storage,'a','first'),true);
 assert.equal(readNameDisplay(storage,'a'),'first');
 assert.equal(readNameDisplay(storage,'b'),'full');
 assert.equal(readNameDisplay(storage,''),'full');
 assert.equal(saveNameDisplay(storage,'','first'),false);
 const unavailable={getItem(){throw Error();},setItem(){throw Error();}};
 assert.equal(readNameDisplay(unavailable,'a'),'full');
 assert.equal(saveNameDisplay(unavailable,'a','first'),false);
});
