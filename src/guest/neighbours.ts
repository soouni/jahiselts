/**
 * Kütiliini naabrid: kes on küti vasakul ja kes paremal käel.
 *
 * Liini järjekord tuletatakse kohtade asukohast (lühim ahel läbi kõigi küttide),
 * mitte kohanumbrist ega pelgalt kaugusest: number võib olla kinnitamata ning
 * kaks lähimat kütti võivad liini otsas seistes olla mõlemad samal pool.
 * Vasak ja parem määratakse näoga aju ala keskkoha poole seistes.
 */
export type LinePoint={id:string;coordinates:[number,number]};
export type LineArea={type:'Polygon';coordinates:[number,number][][]}|null|undefined;
export type Neighbour={id:string;meters:number};
export type LineNeighbours={
 /** Kütiliini järjekord ühest otsast teise. */
 order:string[];
 /** true, kui liini otsad on teineteisele sama lähedal kui tavalised naabrid: liin on ring ja otsi ei ole. */
 closed:boolean;
 /** Naaber kummalgi käel; null tähendab, et sel pool on liini ots. */
 left:Neighbour|null;
 right:Neighbour|null;
 /** false, kui aju ala puudub ja pooli ei saa määrata: siis on left/right lihtsalt „üks pool” ja „teine pool”. */
 sided:boolean;
};
type XY={x:number;y:number};

/** Kohalik tasapind meetrites; jahiala ulatuses piisavalt täpne. */
function project(points:[number,number][]):XY[]{
 const lat0=points.reduce((sum,p)=>sum+p[1],0)/Math.max(points.length,1)*Math.PI/180;
 return points.map(([lon,lat])=>({x:lon*Math.cos(lat0)*111320,y:lat*110540}));
}
const gap=(a:XY,b:XY)=>Math.hypot(a.x-b.x,a.y-b.y);
function pathLength(path:number[],xy:XY[]){let total=0;for(let i=1;i<path.length;i++)total+=gap(xy[path[i-1]],xy[path[i]]);return total;}

/** Lühim avatud ahel läbi kõigi punktide: ahne algus igast punktist ja seejärel 2-opt parandus. Küttide arv on väike, nii et see on kiire. */
function chain(xy:XY[]):number[]{
 const n=xy.length;if(n<3)return xy.map((_,i)=>i);
 let best:number[]=[],bestLength=Infinity;
 for(let start=0;start<n;start++){
  const path=[start],used=new Set([start]);
  while(path.length<n){
   const last=xy[path[path.length-1]];let next=-1,nearest=Infinity;
   for(let i=0;i<n;i++){if(used.has(i))continue;const d=gap(last,xy[i]);if(d<nearest){nearest=d;next=i;}}
   path.push(next);used.add(next);
  }
  const length=pathLength(path,xy);if(length<bestLength){bestLength=length;best=path;}
 }
 for(let improved=true,rounds=0;improved&&rounds<50;rounds++){
  improved=false;
  for(let i=0;i<n-1;i++)for(let j=i+1;j<n;j++){
   const candidate=[...best.slice(0,i),...best.slice(i,j+1).reverse(),...best.slice(j+1)];
   const length=pathLength(candidate,xy);
   if(length<bestLength-1e-6){best=candidate;bestLength=length;improved=true;}
  }
 }
 return best;
}

function centroid(area:LineArea):[number,number]|null{
 const ring=area?.type==='Polygon'?area.coordinates?.[0]:null;
 if(!Array.isArray(ring)||ring.length<3)return null;
 // Suletud ringi viimane punkt kordab esimest; seda ei loeta kaks korda.
 const points=ring.length>3&&ring[0][0]===ring[ring.length-1][0]&&ring[0][1]===ring[ring.length-1][1]?ring.slice(0,-1):ring;
 if(!points.every(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1])))return null;
 return [points.reduce((s,p)=>s+p[0],0)/points.length,points.reduce((s,p)=>s+p[1],0)/points.length];
}

export function lineNeighbours(hunters:LinePoint[],mineId:string,area:LineArea):LineNeighbours|null{
 const mineIndex=hunters.findIndex(h=>h.id===mineId);
 if(mineIndex<0||hunters.length<2)return null;
 const centre=centroid(area);
 const xy=project([...hunters.map(h=>h.coordinates),...(centre?[centre]:[])]);
 const points=xy.slice(0,hunters.length),centreXY=centre?xy[hunters.length]:null;
 const path=chain(points),at=path.indexOf(mineIndex),n=path.length;
 const gaps=path.slice(1).map((index,i)=>gap(points[path[i]],points[index])).sort((a,b)=>a-b);
 const median=gaps.length?gaps[Math.floor((gaps.length-1)/2)]:0;
 // Ring ainult siis, kui otste vahe on tavaliste vahedega samas suurusjärgus; muidu on liinil kaks päris otsa.
 const closed=n>=4&&gap(points[path[0]],points[path[n-1]])<=median*1.5;
 const beside=[at>0?path[at-1]:closed?path[n-1]:-1,at<n-1?path[at+1]:closed?path[0]:-1].filter((index,i,all)=>index>=0&&index!==mineIndex&&all.indexOf(index)===i);
 const me=points[mineIndex];
 const toNeighbour=(index:number):Neighbour=>({id:hunters[index].id,meters:gap(me,points[index])});
 const order=path.map(index=>hunters[index].id);
 if(!centreXY||gap(me,centreXY)<1){
  return {order,closed,left:beside[0]!==undefined?toNeighbour(beside[0]):null,right:beside[1]!==undefined?toNeighbour(beside[1]):null,sided:false};
 }
 // Ristkorrutis vaatesuunaga (aju keskkoha poole): positiivne on vasak käsi, negatiivne parem.
 const facing={x:centreXY.x-me.x,y:centreXY.y-me.y};
 const side=(index:number)=>facing.x*(points[index].y-me.y)-facing.y*(points[index].x-me.x);
 let left:number|undefined,right:number|undefined;
 if(beside.length===2){
  // Liini käänakul võivad mõlemad naabrid jääda samale käele; siis on vasakpoolsem see, kelle ristkorrutis on suurem.
  [left,right]=side(beside[0])>=side(beside[1])?[beside[0],beside[1]]:[beside[1],beside[0]];
 }else if(beside.length===1){
  if(side(beside[0])>=0)left=beside[0];else right=beside[0];
 }
 return {order,closed,left:left!==undefined?toNeighbour(left):null,right:right!==undefined?toNeighbour(right):null,sided:true};
}
