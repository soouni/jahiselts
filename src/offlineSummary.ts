export type OfflinePackageInfo={name:string;completed:number;failed:number;total:number};
export type OfflineProgressInfo={completed:number;failed:number;total:number};
/** Üks lause võrguta kaardi seisu kohta kontoga vaates. */
export function offlineMapMessage(progress:OfflineProgressInfo|null,pack:OfflinePackageInfo|null,tiles:number){
 if(progress)return `Kaardi allalaadimine pooleli: ${progress.completed+progress.failed}/${progress.total} paani.`;
 if(pack){
  return pack.failed>0||pack.completed<pack.total
   ?`Kaardipakett „${pack.name}” on osaline: ${pack.completed}/${pack.total} paani olemas.`
   :`Kaardipakett „${pack.name}” on täielik: ${pack.completed}/${pack.total} paani.`;
 }
 return tiles>0?`Salvestatud on ${tiles} kaardipaani, kuid jahi ala paketti pole loodud.`:'Jahi ala kaardipaketti pole alla laaditud.';
}
