// Shared by the map, editor and legend. Unknown types remain neutral landmarks.
const house='<path d="M6 15 16 6l10 9M9 13v12h14V13M13 25v-8h6v8"/>';
export const placeSymbols:Record<string,{color:string;path:string}>={
 'Jahimaja':{color:'#c45a12',path:house},
 'Maja':{color:'#7845a3',path:house},
 'Kõrvalhoone':{color:'#52616b',path:'<rect x="8" y="9" width="16" height="16"/><path d="M13 25V15h6v10M8 12h16"/>'},
 'Jahitorn':{color:'#27623e',path:'<path d="M8 12h16M10 12V7h12v5M12 13 8 26M20 13l4 13M11 18h10M10 23h12M8 7l8-4 8 4"/>'},
 'Soolakivi':{color:'#8a5c23',path:'<path d="m8 12 8-5 8 5v10l-8 5-8-5Zm0 0 8 5 8-5M16 17v10"/>'},
 'Söödakoht':{color:'#58722e',path:'<path d="M7 19h18l-3 7H10ZM16 18V6M16 11l-5-4M16 15l5-5"/>'},
 'Sild / ületuskoht':{color:'#225e8a',path:'<path d="M6 21h20M7 15h18M8 11v14M24 11v14M12 15v6M16 15v6M20 15v6"/>'},
 'Kogunemiskoht':{color:'#225e8a',path:'<circle cx="12" cy="11" r="3"/><circle cx="22" cy="12" r="2"/><path d="M5 25v-4a7 7 0 0 1 14 0v4M22 18q5 0 5 7"/>'},
 'Parkimiskoht':{color:'#225e8a',path:'<path d="M11 26V7h7a6 6 0 0 1 0 12h-7"/>'},
 'Orientiir':{color:'#52616b',path:'<path d="m16 7 11 19H5Z"/>'},
};
export const placeTypes=Object.keys(placeSymbols);
export function symbolType(type:unknown){return typeof type==='string'&&placeSymbols[type]?type:'Orientiir';}
export function symbolUrl(type:unknown){const {color,path}=placeSymbols[symbolType(type)];return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect x="1" y="1" width="30" height="30" rx="7" fill="white" stroke="${color}" stroke-width="2"/><g fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</g></svg>`);}
