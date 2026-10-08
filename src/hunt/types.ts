/** Jahi andmemudel. Jahipäev koosneb järjestikustest ajudest. */
export type HuntType = 'drive' | 'stand' | 'other';
export type HuntStatus = 'planned' | 'active' | 'paused' | 'finished';
export type DriveStatus = 'planned' | 'ready' | 'active' | 'finished';
export type HuntRole = 'leader' | 'hunter' | 'driver' | 'guest';
export type ParticipantStatus = 'invited' | 'present' | 'moving' | 'at_position' | 'left';
export type GeoPoint = {type:'Point';coordinates:[number,number]};
export type GeoLine = {type:'LineString';coordinates:[number,number][]};
export type GeoPolygon = {type:'Polygon';coordinates:[number,number][][]};
export type Hunt = {id:string;title:string;type:HuntType;status:HuntStatus;leaderId:string;startsAt:string|null;allowSelfSelection:boolean};
export type Drive = {id:string;huntId:string;sequence:number;title:string;status:DriveStatus;area:GeoPolygon|null;lines:GeoLine[]};
export type HuntParticipant = {id:string;huntId:string;userId:string|null;displayName:string;role:HuntRole;status:ParticipantStatus};
export type HuntPosition = {id:string;driveId:string;number:number;location:GeoPoint;assignedParticipantId:string|null;selectedByParticipant:boolean};
export type PositionConfirmation = {positionId:string;participantId:string;confirmedAt:string;distanceMeters:number|null;accuracyMeters:number|null;outsideSuggestedRange:boolean};
export type HuntLocation = {participantId:string;huntId:string;location:GeoPoint;accuracyMeters:number;recordedAt:string;receivedAt:string};
export type HuntEvent = {id:string;huntId:string;driveId:string|null;actorId:string;type:string;occurredAt:string;details:Record<string,unknown>};
