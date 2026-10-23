// Preserve the original page control while one dialog replaces another.
const returnTargets=new WeakMap<Document,HTMLElement>();
export function showDialogWithFocusReturn(dialog:HTMLDialogElement){
 const doc=dialog.ownerDocument;
 const active=doc.activeElement as HTMLElement|null;
 const previous=returnTargets.get(doc);
 const opener=active&&active!==doc.body&&!active.closest('dialog')?active:previous?.isConnected?previous:null;
 if(opener)returnTargets.set(doc,opener);
 dialog.showModal();
 const restore=()=>{
  if(opener?.isConnected&&!doc.querySelector('dialog[open]'))opener.focus({preventScroll:true});
 };
 return {
  // Close while the element is still mounted: native dialog focus restoration
  // otherwise loses its target when React removes the dialog first.
  close(){dialog.close();restore();},
  dispose(){
   dialog.close();
   queueMicrotask(()=>{
    if(doc.querySelector('dialog[open]'))return;
    restore();
    if(returnTargets.get(doc)===opener)returnTargets.delete(doc);
   });
  }
 };
}
