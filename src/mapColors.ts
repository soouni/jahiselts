import type {Kind} from './types';

export const objectPalette=[
 {name:'Kollane',value:'#FFE066'},
 {name:'Helesinine',value:'#66E0FF'},
 {name:'Roosa',value:'#FF8FD3'},
 {name:'Oranž',value:'#FF9955'},
 {name:'Lilla',value:'#C4A0FF'},
 {name:'Roheline',value:'#B6EE75'},
 {name:'Punane',value:'#FF6262'},
 {name:'Valge',value:'#FFFFFF'},
];
const defaults:Record<Kind,string>={area:'#66E0FF',line:'#FFE066',place:'#225E8A',observation:'#CF602C',sign:'#7C4894'};
export function mapColor(kind:Kind,value?:unknown){
 return (kind==='area'||kind==='line')&&typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value.toUpperCase():defaults[kind];
}
export function colorOutline(color:string){
 const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
 return rgb[0]*.299+rgb[1]*.587+rgb[2]*.114>145?'rgba(15,32,25,.95)':'rgba(255,255,255,.96)';
}
export function colorName(color:string){return objectPalette.find(c=>c.value===color)?.name||'Oma värv';}

export function mapWidth(kind:Kind,value?:unknown){
 const fallback=kind==='line'?5:kind==='area'?3:2;
 return (kind==='line'||kind==='area')&&typeof value==='number'&&Number.isFinite(value)?Math.max(1,Math.min(12,Math.round(value))):fallback;
}
