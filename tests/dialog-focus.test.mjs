import test from 'node:test';
import assert from 'node:assert/strict';
import {showDialogWithFocusReturn} from '../src/ui/dialogFocus.ts';

function environment(){
 const doc={body:{},activeElement:null,openDialog:null,querySelector(){return this.openDialog;}};
 const opener={isConnected:true,closest:()=>null,focus(options){doc.activeElement=this;this.focusOptions=options;}};
 doc.activeElement=opener;
 const makeDialog=()=>({ownerDocument:doc,showModal(){doc.openDialog=this;doc.activeElement={closest:()=>this};},close(){if(doc.openDialog===this){doc.openDialog=null;doc.activeElement=doc.body;}}});
 return {doc,opener,makeDialog};
}
test('closing a dialog restores its triggering control before it is unmounted',()=>{
 const {doc,opener,makeDialog}=environment(),controller=showDialogWithFocusReturn(makeDialog());
 assert.notEqual(doc.activeElement,opener);
 controller.close();
 assert.equal(doc.activeElement,opener);
 assert.deepEqual(opener.focusOptions,{preventScroll:true});
});
test('React removal cleanup restores focus even after the native dialog loses it',async()=>{
 const {doc,opener,makeDialog}=environment(),controller=showDialogWithFocusReturn(makeDialog());
 doc.activeElement=doc.body;
 controller.dispose();await Promise.resolve();
 assert.equal(doc.activeElement,opener);
});
test('dialog transitions preserve the page opener without stealing focus from the new dialog',async()=>{
 const {doc,opener,makeDialog}=environment(),first=showDialogWithFocusReturn(makeDialog());
 first.dispose();
 const second=showDialogWithFocusReturn(makeDialog()),insideSecond=doc.activeElement;
 await Promise.resolve();
 assert.equal(doc.activeElement,insideSecond);
 second.close();assert.equal(doc.activeElement,opener);
 second.dispose();await Promise.resolve();
});
test('a removed triggering control is not focused during cleanup',async()=>{
 const {doc,opener,makeDialog}=environment(),controller=showDialogWithFocusReturn(makeDialog());
 opener.isConnected=false;
 controller.dispose();await Promise.resolve();
 assert.equal(doc.activeElement,doc.body);
 assert.equal(opener.focusOptions,undefined);
});
