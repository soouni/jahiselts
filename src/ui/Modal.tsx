import React,{useEffect,useRef} from 'react';
import {X} from 'lucide-react';
import {showDialogWithFocusReturn} from './dialogFocus';

/** Teade, mida `Modal` näitab oma sisu kohal (App seab selle). */
export const ToastContext=React.createContext('');
export function Modal({title,children,onClose}:{title:string;children:React.ReactNode;onClose:()=>void}){
 const message=React.useContext(ToastContext),titleId=React.useId();
 const d=useRef<HTMLDialogElement>(null),focus=useRef<ReturnType<typeof showDialogWithFocusReturn>|null>(null);
 useEffect(()=>{if(!d.current)return;const controller=showDialogWithFocusReturn(d.current);focus.current=controller;return()=>{controller.dispose();focus.current=null;};},[]);
 const close=()=>{focus.current?.close();onClose();};
 return <dialog ref={d} aria-labelledby={titleId} onCancel={e=>{e.preventDefault();close();}} className="sheet"><header><h2 id={titleId}>{title}</h2><button type="button" className="iconbtn" aria-label="Sulge" onClick={close}><X/></button></header><div className="sheetbody">{message&&<div role="alert" className="notice">{message}</div>}{children}</div></dialog>;
}
export function Field({label:txt,children}:{label:string;children:React.ReactNode}){return <label className="field"><span>{txt}</span>{children}</label>;}
