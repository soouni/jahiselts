import SunCalc from 'suncalc';
import {PARNJOE_WEATHER_POINT} from './hunt/wind.ts';

// Laskevalguse lävi: Päikese kõrgus horisondi suhtes kraadides. Arvutuslik hinnang, mitte juriidiline aeg.
export const SHOOTING_LIGHT_DEGREES=-6;
export const TWILIGHT_DEGREES=-12;
const tz='Europe/Tallinn';
const parts=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'});
const clock=new Intl.DateTimeFormat('et-EE',{timeZone:tz,hour:'2-digit',minute:'2-digit'});
let registered=false;
function register(){
 if(registered)return;
 registered=true;
 SunCalc.addTime(TWILIGHT_DEGREES,'twilightStart','twilightEnd');
 SunCalc.addTime(SHOOTING_LIGHT_DEGREES,'shootingStart','shootingEnd');
}
export type SunTimes={twilightStart:Date;shootingStart:Date;sunrise:Date;sunset:Date;shootingEnd:Date;twilightEnd:Date};
export function parnjoeSunTimes(now:number|Date=Date.now()):SunTimes{
 register();
 const [y,m,d]=parts.format(now).split('-').map(Number);
 const noon=new Date(Date.UTC(y,m-1,d,12));
 const [lon,lat]=PARNJOE_WEATHER_POINT;
 const t=SunCalc.getTimes(noon,lat,lon) as any;
 return {twilightStart:t.twilightStart,shootingStart:t.shootingStart,sunrise:t.sunrise,sunset:t.sunset,shootingEnd:t.shootingEnd,twilightEnd:t.twilightEnd};
}
export function formatSunTime(date:Date){return Number.isNaN(date.getTime())?'—':clock.format(date);}
