import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from 'ol/interaction/defaults.js';
import DragPan from 'ol/interaction/DragPan.js';
import PinchZoom from 'ol/interaction/PinchZoom.js';
import KeyboardPan from 'ol/interaction/KeyboardPan.js';
import KeyboardZoom from 'ol/interaction/KeyboardZoom.js';
import View from 'ol/View.js';
import {mapInteractions} from '../src/mapInteractions.ts';

test('an unfocused tabindex map accepts the first finger drag without losing keyboard or pinch controls',()=>{
 const previous=globalThis.ShadowRoot;
 const previousDocument=globalThis.document;
 globalThis.ShadowRoot=class ShadowRoot {};
 globalThis.document={createElement:()=>({style:{}})};
 try{
  const root={activeElement:{}};
  const target={getRootNode:()=>root,hasAttribute:name=>name==='tabindex',contains:()=>false};
  const view=new View({center:[0,0],zoom:11});
  const map={getView:()=>view,getTargetElement:()=>target,getOwnerDocument:()=>root,getEventPixel:event=>[event.clientX,event.clientY]};
  const originalEvent={pointerId:1,pointerType:'touch',isPrimary:true,button:0,altKey:false,ctrlKey:false,metaKey:false,shiftKey:false,clientX:100,clientY:100,preventDefault(){}};
  const event={map,originalEvent};
  const oldPan=defaults({onFocusOnly:true}).getArray().find(i=>i instanceof DragPan);
  oldPan.targetPointers=[originalEvent];
  assert.equal(oldPan.handleDownEvent(event),false,'reproduce focus gate that blocks first touch');
  const interactions=mapInteractions().getArray();
  const pan=interactions.find(i=>i instanceof DragPan);
  pan.targetPointers=[originalEvent];
  assert.equal(pan.handleDownEvent(event),true,'finger can start panning without keyboard focus');
  pan.handleDragEvent(event);
  originalEvent.clientX=140;
  pan.handleDragEvent(event);
  assert.ok(view.getCenter()[0]<0,'finger movement actually changes the map center');
  assert.ok(interactions.some(i=>i instanceof PinchZoom));
  assert.ok(interactions.some(i=>i instanceof KeyboardPan));
  assert.ok(interactions.some(i=>i instanceof KeyboardZoom));
 }finally{
  if(previous===undefined)delete globalThis.ShadowRoot;else globalThis.ShadowRoot=previous;
  if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
 }
});
