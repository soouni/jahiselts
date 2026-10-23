import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from 'ol/interaction/defaults.js';
import KeyboardPan from 'ol/interaction/KeyboardPan.js';
import KeyboardZoom from 'ol/interaction/KeyboardZoom.js';
import View from 'ol/View.js';

function keyboardMap(){
 const interactions=defaults({shiftDragZoom:false}).getArray();
 const pan=interactions.find(i=>i instanceof KeyboardPan),zoom=interactions.find(i=>i instanceof KeyboardZoom);
 assert.ok(pan);assert.ok(zoom);
 const view=new View({center:[0,0],zoom:11});
 // Complete animations immediately; exercise OL's normal key conditions and
 // constrained view changes without a browser animation scheduler.
 view.animateInternal=options=>view.setCenter(options.center);
 view.animate=options=>view.setResolution(options.resolution);
 const map={getView:()=>view};
 function press(interaction,key,tagName='DIV',isContentEditable=false){
  let prevented=false;
  const handled=!interaction.handleEvent({type:'keydown',map,originalEvent:{key,target:{tagName,isContentEditable},altKey:false,metaKey:false,ctrlKey:false,shiftKey:false,preventDefault(){prevented=true;}}});
  return {handled,prevented};
 }
 return {pan,zoom,view,press};
}
test('standard OpenLayers interactions pan with arrows and zoom with plus/minus',()=>{
 const {pan,zoom,view,press}=keyboardMap();
 assert.deepEqual(press(pan,'ArrowRight'),{handled:true,prevented:true});assert.ok(view.getCenter()[0]>0);
 assert.deepEqual(press(pan,'ArrowLeft'),{handled:true,prevented:true});assert.equal(view.getCenter()[0],0);
 press(pan,'ArrowUp');assert.ok(view.getCenter()[1]>0);
 press(pan,'ArrowDown');assert.equal(view.getCenter()[1],0);
 const originalZoom=view.getZoom();
 assert.deepEqual(press(zoom,'+'),{handled:true,prevented:true});assert.equal(view.getZoom(),originalZoom+1);
 assert.deepEqual(press(zoom,'-'),{handled:true,prevented:true});assert.equal(view.getZoom(),originalZoom);
});
test('map keyboard interactions leave editable controls and unrelated keys alone',()=>{
 const {pan,zoom,view,press}=keyboardMap();
 const originalZoom=view.getZoom();
 for(const tag of ['INPUT','TEXTAREA','SELECT']){
  assert.deepEqual(press(pan,'ArrowRight',tag),{handled:false,prevented:false});
  assert.deepEqual(press(zoom,'+',tag),{handled:false,prevented:false});
 }
 assert.deepEqual(press(pan,'ArrowRight','DIV',true),{handled:false,prevented:false});
 assert.deepEqual(press(zoom,'+','DIV',true),{handled:false,prevented:false});
 assert.deepEqual(press(pan,'Tab'),{handled:false,prevented:false});
 assert.deepEqual(press(zoom,'Escape'),{handled:false,prevented:false});
 assert.deepEqual(view.getCenter(),[0,0]);assert.equal(view.getZoom(),originalZoom);
});
