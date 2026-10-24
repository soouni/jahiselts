import type {HuntNameDisplay} from './nameDisplay';
export function NameDisplaySettings({value,onChange}:{value:HuntNameDisplay;onChange:(value:HuntNameDisplay)=>void}){
 return <label className="field"><span>Jahiliikmete nimed kaardil</span><select value={value} onChange={event=>onChange(event.target.value as HuntNameDisplay)}><option value="full">Täisnimi</option><option value="first">Eesnimi</option></select><small className="muted">Sama eesnime korral lisandub perenime esitäht. Valik kehtib sinu vaates ja salvestatakse selles seadmes kasutaja kaupa.</small></label>;
}
