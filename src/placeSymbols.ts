// Shared by the map, editor and legend. Unknown types remain neutral landmarks.
export const symbolSize=20;
export function isWaterSymbol(type:unknown){return type==='Tiik'||type==='Muu veekogu';}
export function placeSymbolSize(type:unknown,selected=false){return isWaterSymbol(type)?selected?26:20:symbolSize;}
const house='<path d="M3 14 16 3l13 11h-4v15H7V14Z"/>';
export const placeSymbols:Record<string,{color:string;path:string}>={
 'Jahimaja':{color:'#c45a12',path:house},
 'Maja':{color:'#7845a3',path:house},
 'Kõrvalhoone':{color:'#52616b',path:'<rect x="5" y="5" width="22" height="22"/>'},
 'Jahitorn':{color:'#27623e',path:'<path d="M6 4h20v12h-5l5 13h-6l-4-11-4 11H6l5-13H6Z"/>'},
 'Soolakivi':{color:'#8a5c23',path:'<path d="m16 3 13 13-13 13L3 16Z"/>'},
 'Söödakoht':{color:'#58722e',path:'<path d="M3 8h26l-5 18H8Z"/>'},
 'Tiik':{color:'#1676b8',path:'<circle cx="16" cy="16" r="14"/>'},
 'Muu veekogu':{color:'#1676b8',path:'<circle cx="16" cy="16" r="14"/>'},
 'Sild / ületuskoht':{color:'#225e8a',path:'<path d="M3 7h7v6h12V7h7v18h-7v-6H10v6H3Z"/>'},
 'Kogunemiskoht':{color:'#225e8a',path:'<circle cx="16" cy="16" r="12"/>'},
 'Parkimiskoht':{color:'#225e8a',path:'<path fill-rule="evenodd" d="M7 3h12a9 9 0 0 1 0 18h-5v8H7Zm7 6v6h5a3 3 0 0 0 0-6Z"/>'},
 'Orientiir':{color:'#52616b',path:'<path d="m16 3 13 25H3Z"/>'},
};
export const placeTypes=Object.keys(placeSymbols);
export function symbolType(type:unknown){return typeof type==='string'&&placeSymbols[type]?type:'Orientiir';}
export function symbolUrl(type:unknown){if(isWaterSymbol(type))return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="17" r="15" fill="#102e26" opacity=".25"/><circle cx="16" cy="15.5" r="14" fill="#1676b8" stroke="white" stroke-width="2"/><path d="M7 16q4.5-5 9 0t9 0" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>');const {color,path}=placeSymbols[symbolType(type)];return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g fill="${color}" stroke="white" stroke-width="3" stroke-linejoin="round" paint-order="stroke fill">${path}</g></svg>`);}
