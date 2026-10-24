export type HuntNameDisplay='full'|'first';
type NamedPerson={id:string;display_name:string};
const key=(userId:string)=>'parnjoe:hunt-name-display:'+userId;
export function readNameDisplay(storage:Pick<Storage,'getItem'>,userId:string):HuntNameDisplay{
 if(!userId)return 'full';
 try{return storage.getItem(key(userId))==='first'?'first':'full';}catch{return 'full';}
}
export function saveNameDisplay(storage:Pick<Storage,'setItem'>,userId:string,mode:HuntNameDisplay):boolean{
 if(!userId)return false;
 try{storage.setItem(key(userId),mode);return true;}catch{return false;}
}
const parts=(name:string)=>name.trim().split(/\s+/).filter(Boolean);
const firstKey=(name:string)=>(parts(name)[0]||'').normalize('NFC').toLocaleLowerCase('et-EE');
export function huntPersonName(person:NamedPerson,people:NamedPerson[],mode:HuntNameDisplay):string{
 const words=parts(person.display_name);
 if(!words.length)return 'Nimeta';
 if(mode==='full')return words.join(' ');
 const duplicate=people.some(other=>other.id!==person.id&&firstKey(other.display_name)===firstKey(person.display_name));
 return words[0]+(duplicate&&words.length>1?' '+Array.from(words.at(-1)!)[0].toLocaleUpperCase('et-EE')+'.':'');
}
