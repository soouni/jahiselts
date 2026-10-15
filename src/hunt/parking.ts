/** Private, account-scoped device storage. Never sent to the club. */
export type ParkingSpot={userId:string;coordinates:[number,number];accuracy:number;savedAt:number;expiresAt:number};
type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
const PREFIX='parnjoe-parking-v1:';
export const PARKING_TTL=48*60*60*1000;
export function validCoordinates(value:unknown):value is [number,number]{return Array.isArray(value)&&value.length===2&&value.every(Number.isFinite)&&Math.abs(value[0])<=180&&Math.abs(value[1])<=90;}
export function directionsUrl(coordinates:[number,number],mode:'driving'|'walking'){
 if(!validCoordinates(coordinates))return null;
 const url=new URL('https://www.google.com/maps/dir/');
 url.search=new URLSearchParams({api:'1',destination:coordinates[1]+','+coordinates[0],travelmode:mode}).toString();
 return url.href;
}
export function readParking(storage:Store,userId:string,now=Date.now()):ParkingSpot|null{
 if(!userId)return null;
 try{const spot=JSON.parse(storage.getItem(PREFIX+userId)||'null');
  if(!spot)return null;
  if(spot.userId!==userId||!validCoordinates(spot.coordinates)||!Number.isFinite(spot.accuracy)||spot.accuracy<0||spot.accuracy>50||!Number.isFinite(spot.savedAt)||!Number.isFinite(spot.expiresAt)||spot.savedAt>now+5000||spot.expiresAt<=now||spot.expiresAt<=spot.savedAt||spot.expiresAt-spot.savedAt>PARKING_TTL){clearParking(storage,userId);return null;}
  return spot;
 }catch{return null;}
}
export function saveParking(storage:Store,userId:string,fix:{coords:[number,number];accuracy:number;at:number},now=Date.now()):ParkingSpot{
 if(!userId||!validCoordinates(fix.coords)||!Number.isFinite(fix.accuracy)||fix.accuracy<0||fix.accuracy>50||!Number.isFinite(fix.at)||now-fix.at>30000||fix.at>now+5000)throw new Error('Auto asukoha salvestamiseks oota värsket GPS-mõõtmist täpsusega kuni ±50 m.');
 const spot:ParkingSpot={userId,coordinates:[...fix.coords],accuracy:fix.accuracy,savedAt:now,expiresAt:now+PARKING_TTL};
 storage.setItem(PREFIX+userId,JSON.stringify(spot));return spot;
}
export function clearParking(storage:Store,userId:string){try{if(userId)storage.removeItem(PREFIX+userId);}catch{/* Storage unavailable. */}}
