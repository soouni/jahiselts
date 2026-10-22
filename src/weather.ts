import {PARNJOE_WEATHER_POINT} from './hunt/wind.ts';

export type WeatherHour={time:number;temperature:number|null;precipitation:number|null;wind:number|null;gust:number|null;direction:number|null;code:number|null;day:boolean};
export type WeatherForecast={fetchedAt:number;hours:WeatherHour[]};
type StorageLike=Pick<Storage,'getItem'|'setItem'>;
const CACHE_KEY='parnjoe-weather-v1';
export const WEATHER_MAX_AGE=30*60*1000;
export function parnjoeForecastUrl(){
 const [longitude,latitude]=PARNJOE_WEATHER_POINT;
 const params=new URLSearchParams({latitude:String(latitude),longitude:String(longitude),hourly:'temperature_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day',forecast_hours:'8',timeformat:'unixtime',timezone:'Europe/Tallinn',wind_speed_unit:'ms'});
 return 'https://api.open-meteo.com/v1/forecast?'+params;
}
const numberOrNull=(value:unknown,min=-Infinity,max=Infinity)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max?value:null;
export function parseForecast(data:unknown,fetchedAt:number):WeatherForecast{
 const root=data as {hourly?:Record<string,unknown>;hourly_units?:Record<string,unknown>}|null;
 const hourly=root?.hourly,units=root?.hourly_units;
 if(!hourly||!Array.isArray(hourly.time)||!hourly.time.length||!Number.isFinite(fetchedAt)||units?.time!=='unixtime'||units.temperature_2m!=='°C'||units.precipitation!=='mm'||units.wind_speed_10m!=='m/s'||units.wind_gusts_10m!=='m/s')throw new Error('Ilmateenuse vastus on puudulik.');
 const at=(key:string,i:number)=>Array.isArray(hourly[key])?(hourly[key] as unknown[])[i]:null;
 const hours=hourly.time.map((time:unknown,i:number):WeatherHour=>{
  if(typeof time!=='number'||!Number.isFinite(time)||time<0||!Number.isFinite(new Date(time*1000).getTime()))throw new Error('Ilmateate kellaaeg on vigane.');
  return {time,temperature:numberOrNull(at('temperature_2m',i),-100,70),precipitation:numberOrNull(at('precipitation',i),0),wind:numberOrNull(at('wind_speed_10m',i),0),gust:numberOrNull(at('wind_gusts_10m',i),0),direction:numberOrNull(at('wind_direction_10m',i),0,360),code:numberOrNull(at('weather_code',i),0,99),day:at('is_day',i)===1};
 }).sort((a,b)=>a.time-b.time);
 if(new Set(hours.map(h=>h.time)).size!==hours.length)throw new Error('Ilmateate kellaajad korduvad.');
 return {fetchedAt,hours};
}
/** Always select the next six full hours, including across midnight and DST. */
export function nextWeatherHours(forecast:WeatherForecast|null,now:number){
 const first=(Math.floor(now/3600000)+1)*3600;
 return forecast?.hours.filter(h=>h.time>=first&&h.time<first+6*3600).slice(0,6)||[];
}
export function weatherIsStale(forecast:WeatherForecast,now:number){return now-forecast.fetchedAt>=WEATHER_MAX_AGE||now<forecast.fetchedAt-5000;}
export function readWeatherCache(storage:StorageLike,now=Date.now()):WeatherForecast|null{
 try{
  const saved=JSON.parse(storage.getItem(CACHE_KEY)||'null');
  if(!saved||saved.version!==1||saved.longitude!==PARNJOE_WEATHER_POINT[0]||saved.latitude!==PARNJOE_WEATHER_POINT[1]||typeof saved.fetchedAt!=='number'||now-saved.fetchedAt>24*3600000||saved.fetchedAt>now+5000)return null;
  return parseForecast(saved.data,saved.fetchedAt);
 }catch{return null;}
}
export async function loadParnjoeForecast(signal:AbortSignal,storage?:StorageLike):Promise<WeatherForecast>{
 const response=await fetch(parnjoeForecastUrl(),{signal});
 if(!response.ok)throw new Error('Ilmateenuse päring ebaõnnestus.');
 const data:unknown=await response.json(),fetchedAt=Date.now(),forecast=parseForecast(data,fetchedAt);
 if(!nextWeatherHours(forecast,fetchedAt).length)throw new Error('Ilmateenuse vastus ei sisalda tulevasi tunde.');
 try{storage?.setItem(CACHE_KEY,JSON.stringify({version:1,longitude:PARNJOE_WEATHER_POINT[0],latitude:PARNJOE_WEATHER_POINT[1],fetchedAt,data}));}catch{/* Weather remains usable when storage is unavailable. */}
 return forecast;
}
export function weatherDescription(code:number|null){
 if(code===0)return 'Selge';
 if(code===1)return 'Vähene pilvisus';
 if(code===2)return 'Vahelduv pilvisus';
 if(code===3)return 'Pilves';
 if(code===45||code===48)return 'Udu';
 if(code!==null&&[51,53,55,56,57].includes(code))return 'Uduvihm';
 if(code!==null&&[61,63,65,66,67,80,81,82].includes(code))return 'Vihm';
 if(code!==null&&[71,73,75,77,85,86].includes(code))return 'Lumesadu';
 if(code!==null&&[95,96,99].includes(code))return 'Äike';
 return 'Ilmanähtus teadmata';
}
