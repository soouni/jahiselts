/** Fixed point near the centroid of the official Pärnjõe hunting boundary (lon, lat). */
export const PARNJOE_WEATHER_POINT = [24.892,58.639] as const;
/** Weather never uses the device location or a participant's hunting position. */
export function parnjoeWindUrl(){
 const [longitude,latitude]=PARNJOE_WEATHER_POINT;
 return 'https://api.open-meteo.com/v1/forecast?latitude='+latitude+'&longitude='+longitude+'&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&timezone=Europe%2FTallinn';
}
export type WindReading={speed:number;direction:number;time:string;fetchedAt:number};
/** Weather direction is where wind comes FROM; arrows show where it flows TO. */
export function windFlowDegrees(from:number,mapRotation=0){return ((from+180+mapRotation*180/Math.PI)%360+360)%360;}
export function windIsCurrent(reading:WindReading|null,now:number){return Boolean(reading&&Number.isFinite(reading.speed)&&reading.speed>=0&&Number.isFinite(reading.direction)&&reading.direction>=0&&reading.direction<=360&&Number.isFinite(reading.fetchedAt)&&now-reading.fetchedAt>=-5000&&now-reading.fetchedAt<30*60*1000);}
export function windCardinal(degrees:number){return ['N','NE','E','SE','S','SW','W','NW'][Math.round(((degrees%360+360)%360)/45)%8];}
