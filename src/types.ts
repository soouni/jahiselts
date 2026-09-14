export type Kind='area'|'line'|'place'|'observation'|'sign';
export type Role='admin'|'member'|'viewer';
export type Geometry={type:string;coordinates:any};
export type Entry={id:string;kind:Kind;geometry:Geometry;properties:Record<string,any>;created_by:string;creator_name?:string;updater_name?:string;created_at:string;updated_at:string;version:number;deleted_at:string|null};
export type Member={user_id:string|null;email:string;display_name:string;role:Role;active:boolean};
export const kinds:Record<Kind,string>={area:'Metsatukad',line:'Sihid ja jooned',place:'Kohad',observation:'Vaatlused',sign:'Jäljed ja ulukimärgid'};
export const species=['Põder','Metssiga','Metskits','Punahirv','Kobras','Rebane','Kährik','Karu','Hunt','Ilves','Mäger','Halljänes','Valgejänes','Šaakal','Muu'];
export const signs=['Jalajälg / jäljerida','Väljaheited','Magamisase','Söömisjäljed','Puu hõõrumine või koorimine','Karvad','Ulukirada','Muu'];
export const freshness=['Kuni 24 tundi','1–3 päeva','Üle 3 päeva','Teadmata'];
export type Filters={species:string;period:string;from:string;to:string;freshness:string;observations:boolean;signs:boolean};
export const initialFilters:Filters={species:'',period:'30',from:'',to:'',freshness:'',observations:true,signs:true};
export const allLayers:Kind[]=['area','line','place','observation','sign'];
export function label(e:Entry){return e.properties.name||e.properties.species||'Liik teadmata';}
export function canEdit(e:Entry,m:Member|null,userId:string){return !!m&&(m.role==='admin'||m.role==='member'&&['observation','sign'].includes(e.kind)&&e.created_by===userId);}
export function errorMessage(e:any){const m=e?.message||String(e);if(e?.code==='email_address_not_authorized'||/email address not authorized/i.test(m))return 'Sisselogimiskirjade saatmine ei ole veel kõigile liikmetele seadistatud. Võta ühendust adminiga.';if(e?.code==='over_email_send_rate_limit'||e?.status===429)return 'Sisselogimiskirju on saadetud liiga tihti. Oota veidi ja proovi uuesti.';if(e?.code==='otp_expired')return 'Kood on vale või aegunud. Küsi uus sisselogimiskood.';if(/permission|lubatud|denied/i.test(m))return 'Sul ei ole selleks tegevuseks õigust.';if(/conflict|muudetud/i.test(m))return 'Kirjet on vahepeal muudetud. Ava värske versioon ja proovi uuesti.';return m;}
