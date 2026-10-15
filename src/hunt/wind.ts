export type WindReading={speed:number;direction:number;time:string;fetchedAt:number};
/** Weather direction is where wind comes FROM; arrows show where it flows TO. */
export function windFlowDegrees(from:number,mapRotation=0){return ((from+180+mapRotation*180/Math.PI)%360+360)%360;}
export function windIsCurrent(reading:WindReading|null,now:number){return Boolean(reading&&Number.isFinite(reading.speed)&&reading.speed>=0&&Number.isFinite(reading.direction)&&reading.direction>=0&&reading.direction<=360&&Number.isFinite(reading.fetchedAt)&&now-reading.fetchedAt>=-5000&&now-reading.fetchedAt<30*60*1000);}
export function windCardinal(degrees:number){return ['N','NE','E','SE','S','SW','W','NW'][Math.round(((degrees%360+360)%360)/45)%8];}
