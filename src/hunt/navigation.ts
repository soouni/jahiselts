export type OrientationReading={webkitCompassHeading?:number;alpha?:number|null;absolute?:boolean};

export function normalizedHeading(reading:OrientationReading){
 const raw=typeof reading.webkitCompassHeading==='number'
  ?reading.webkitCompassHeading
  :typeof reading.alpha==='number'&&reading.absolute?360-reading.alpha:null;
 return raw===null||!Number.isFinite(raw)?null:(raw%360+360)%360;
}

export function distanceAndBearing(from:[number,number],to:[number,number]){
 if(![...from,...to].every(Number.isFinite))return null;
 const [lon1,lat1]=from.map(v=>v*Math.PI/180),[lon2,lat2]=to.map(v=>v*Math.PI/180);
 const dLat=lat2-lat1,dLon=lon2-lon1;
 const a=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
 const meters=6371000*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)));
 const y=Math.sin(dLon)*Math.cos(lat2),x=Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
 return {meters,bearing:(Math.atan2(y,x)*180/Math.PI+360)%360};
}

export function relativeBearing(bearing:number,deviceHeading:number|null){
 return (bearing-(deviceHeading??0)+360)%360;
}
