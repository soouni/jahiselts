export type GpsFix={coords:[number,number];accuracy:number;at:number};
export const GPS_MAX_AGE_MS=30000;
export const GPS_CONFIRM_ACCURACY_M=50;
export function gpsUsable(fix:GpsFix|null,active:boolean,now=Date.now()){
 return Boolean(active&&fix&&fix.coords.every(Number.isFinite)&&Math.abs(fix.coords[0])<=180&&Math.abs(fix.coords[1])<=90&&Number.isFinite(fix.accuracy)&&fix.accuracy>=0&&Number.isFinite(fix.at)&&now-fix.at>=-5000&&now-fix.at<=GPS_MAX_AGE_MS);
}
export function canConfirmGps(fix:GpsFix|null,active:boolean,now=Date.now()){
 return gpsUsable(fix,active,now)&&fix!.accuracy<=GPS_CONFIRM_ACCURACY_M;
}
/** A successful subscription is not evidence that the snapshot was loaded. */
export function createRefreshRunner(load:()=>Promise<void>,success:()=>void,failure:()=>void){
 let active=true,running=false,again=false;
 return {async run(){
  if(!active)return;
  if(running){again=true;return;}
  running=true;
  try{do{again=false;try{await load();if(active)success();}catch{if(active)failure();}}while(active&&again);}
  finally{running=false;}
 },dispose(){active=false;again=false;}};
}
