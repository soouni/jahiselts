import test from 'node:test';
import assert from 'node:assert/strict';
import {loadParnjoeForecast,nextWeatherHours,parseForecast,parnjoeForecastUrl,readWeatherCache,weatherIsStale} from '../src/weather.ts';

const now=Date.parse('2026-10-22T13:29:00Z');
function payload(start=Math.floor(now/3600000)*3600){return {
 hourly_units:{time:'unixtime',temperature_2m:'°C',precipitation:'mm',wind_speed_10m:'m/s',wind_gusts_10m:'m/s'},
 hourly:{time:Array.from({length:8},(_,i)=>start+i*3600),temperature_2m:[10,9,null,7,6,5,4,3],precipitation:[0,0,null,1,2,0,0,0],wind_speed_10m:[2,3,4,5,6,7,8,9],wind_gusts_10m:[4,5,6,7,8,9,10,11],wind_direction_10m:[0,45,90,135,180,225,270,315],weather_code:[0,1,2,3,61,63,71,95],is_day:[1,1,1,1,0,0,0,0]}
};}
const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};};

test('six-hour request uses the fixed Pärnjõe point with explicit time and wind units',()=>{
 const url=new URL(parnjoeForecastUrl());
 assert.equal(url.hostname,'api.open-meteo.com');
 assert.equal(url.searchParams.get('latitude'),'58.639');assert.equal(url.searchParams.get('longitude'),'24.892');
 assert.equal(url.searchParams.get('timeformat'),'unixtime');assert.equal(url.searchParams.get('timezone'),'Europe/Tallinn');
 assert.equal(url.searchParams.get('wind_speed_unit'),'ms');assert.equal(url.searchParams.get('forecast_hours'),'8');
 for(const variable of ['temperature_2m','precipitation','weather_code','wind_gusts_10m'])assert.ok(url.searchParams.get('hourly').split(',').includes(variable));
});
test('next six full hours exclude past hours and preserve missing data rather than showing zero',()=>{
 const forecast=parseForecast(payload(),now),hours=nextWeatherHours(forecast,now);
 assert.equal(hours.length,6);assert.equal(hours[0].time,Date.parse('2026-10-22T14:00:00Z')/1000);
 assert.equal(hours[1].temperature,null);assert.equal(hours[1].precipitation,null);
 assert.equal(forecast.hours[0].precipitation,0);
 assert.equal(nextWeatherHours(forecast,now+24*3600000).length,0);
 assert.equal(weatherIsStale(forecast,now+29*60000),false);assert.equal(weatherIsStale(forecast,now+30*60000),true);
});
test('six-hour selection crosses midnight and the Tallinn autumn clock change in chronological order',()=>{
 for(const iso of ['2026-10-22T20:29:00Z','2026-10-25T00:29:00Z']){
  const at=Date.parse(iso),forecast=parseForecast(payload(Math.floor(at/3600000)*3600),at);
  const hours=nextWeatherHours(forecast,at);assert.equal(hours.length,6);
  for(let i=1;i<hours.length;i++)assert.equal(hours[i].time-hours[i-1].time,3600);
 }
});
test('invalid timestamps and incompatible measurement units reject the forecast',()=>{
 assert.throws(()=>parseForecast({},now));
 const bad=payload();bad.hourly_units.wind_speed_10m='km/h';assert.throws(()=>parseForecast(bad,now));
 const duplicate=payload();duplicate.hourly.time[1]=duplicate.hourly.time[0];assert.throws(()=>parseForecast(duplicate,now));
 const invalid=payload();invalid.hourly.time[0]=null;assert.throws(()=>parseForecast(invalid,now));
});
test('successful data survives offline, but errors and bad caches cannot replace valid cached data',async t=>{
 const at=Date.now(),data=payload(Math.floor(at/3600000)*3600),storage=memory();
 const fetchMock=t.mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify(data),{status:200}));
 await loadParnjoeForecast(new AbortController().signal,storage);
 const cached=readWeatherCache(storage,at+1000);assert.ok(cached);assert.equal(cached.hours.length,8);
 fetchMock.mock.mockImplementation(async()=>new Response('',{status:503}));
 await assert.rejects(loadParnjoeForecast(new AbortController().signal,storage));assert.deepEqual(readWeatherCache(storage,at+1000),cached);
 assert.equal(readWeatherCache(storage,at+25*3600000),null);
 assert.equal(readWeatherCache({getItem:()=>'{bad',setItem(){}},at),null);
 const full={getItem(){throw Error('denied');},setItem(){throw Error('quota');}};
 assert.equal(readWeatherCache(full,at),null);
 fetchMock.mock.mockImplementation(async()=>new Response(JSON.stringify(data),{status:200}));
 assert.ok(await loadParnjoeForecast(new AbortController().signal,full));
});
