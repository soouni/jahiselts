import type {ClubChoice,HuntPersonRow} from './api';

/** Seltsi liikmele vastav jahil osaleja: sama konto või sama nimi (tühikute ja suurtähtede erinevusest hoolimata). */
export function matchingParticipant(people:HuntPersonRow[],person:ClubChoice){
 const normalize=(name:string)=>name.trim().replace(/\s+/g,' ').toLocaleLowerCase('et');
 return people.find(p=>(!!p.user_id&&p.user_id===person.user_id)||normalize(p.display_name)===normalize(person.display_name));
}
