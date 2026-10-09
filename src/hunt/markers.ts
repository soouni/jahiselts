export function markerSvg(role:'hunter'|'driver'|'dog_driver'){
 const icon=role==='dog_driver'
 ? '<rect x="5" y="7" width="18" height="10" fill="white"/><circle cx="5" cy="7" r="4" fill="white"/><circle cx="5" cy="17" r="4" fill="white"/><circle cx="23" cy="7" r="4" fill="white"/><circle cx="23" cy="17" r="4" fill="white"/>'
 : role==='driver'
 ? '<path d="M8 5c-2 1-3 4-3 7l2 5 5-1 1-5-2-5zM17 13c-2 1-3 4-3 7l2 5 5-1 1-5-2-5z" transform="translate(0 -2) scale(.9)" fill="white"/><circle cx="8" cy="4" r="1.5" fill="white"/><circle cx="18" cy="12" r="1.5" fill="white"/>'
 : '<path d="M12 4h4l1 4v13H11V8zM12 3l1-2h2l1 2zM11 20h6v2h-6z" fill="white" transform="translate(-1 1)"/>';
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" fill="#176c52" stroke="white" stroke-width="4"/><g transform="translate(10 10) scale(1.15)">'+icon+'</g></svg>';
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
const hunterMarker=markerSvg('hunter');
const driverMarker=markerSvg('driver');
const dogDriverMarker=markerSvg('dog_driver');


export function huntMarkerUrl(role:string){return role==='dog_driver'?dogDriverMarker:role==='driver'?driverMarker:hunterMarker;}
