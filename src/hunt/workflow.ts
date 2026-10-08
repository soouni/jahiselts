import type {Drive,Hunt,HuntLocation,HuntParticipant,HuntPosition,PositionConfirmation} from './types';

/** Jahis võib korraga aktiivne olla ainult üks aju. Server peab sama reeglit tehingus jõustama. */
export function canStartDrive(hunt:Hunt, drives:Drive[], driveId:string):boolean {
 const target=drives.find(d=>d.id===driveId&&d.huntId===hunt.id);
 return hunt.status!=='finished' && !!target && (target.status==='planned'||target.status==='ready') &&
 !drives.some(d=>d.huntId===hunt.id&&d.status==='active');
}
export function canSelectPosition(hunt:Hunt, participant:HuntParticipant, position:HuntPosition, actingAsLeader:boolean):boolean {
 return hunt.status!=='finished' && participant.huntId===hunt.id &&
 (participant.role==='hunter'||participant.role==='leader'||participant.role==='guest') &&
 (actingAsLeader||hunt.allowSelfSelection) && position.assignedParticipantId===null;
}
export function distanceMeters(a:[number,number],b:[number,number]):number {
 const rad=Math.PI/180,lat1=a[1]*rad,lat2=b[1]*rad,dLat=(b[1]-a[1])*rad,dLon=(b[0]-a[0])*rad;
 const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
 return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
/** GPS-i läheduse märge on nõuandev; lõpliku kinnituse teeb inimene. */
export function checkPositionProximity(position:HuntPosition,location:HuntLocation|null,thresholdMeters=50) {
 if(!location)return {state:'unknown' as const,distanceMeters:null,accuracyMeters:null};
 const distance=distanceMeters(position.location.coordinates,location.location.coordinates);
 if(!Number.isFinite(location.accuracyMeters)||location.accuracyMeters<0)return {state:'unknown' as const,distanceMeters:distance,accuracyMeters:null};
 const state=location.accuracyMeters>thresholdMeters?'uncertain':distance<=thresholdMeters?'near':'far';
 return {state,distanceMeters:Math.round(distance),accuracyMeters:location.accuracyMeters};
}
export function confirmPosition(position:HuntPosition,participant:HuntParticipant,location:HuntLocation|null,at:string):PositionConfirmation {
 if(position.assignedParticipantId!==participant.id)throw new Error('Positsioon ei ole sellele jahimehele määratud.');
 const proximity=checkPositionProximity(position,location);
 return {positionId:position.id,participantId:participant.id,confirmedAt:at,distanceMeters:proximity.distanceMeters,accuracyMeters:proximity.accuracyMeters,outsideSuggestedRange:proximity.state!=='near'};
}
export function locationFreshness(location:HuntLocation|null,nowMs:number):'fresh'|'stale'|'unknown' {
 if(!location)return 'unknown';
 const age=nowMs-Date.parse(location.recordedAt);
 return Number.isFinite(age)&&age>=0&&age<=60000?'fresh':'stale';
}
