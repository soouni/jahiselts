import {Check} from 'lucide-react';
import {objectPalette,colorOutline} from './mapColors';

export function ObjectColorPicker({value,onChange}:{value:string;onChange:(value:string)=>void}){
 return <fieldset className="object-colors"><legend>Värv kaardil</legend>
  <div className="color-palette">{objectPalette.map(c=><button type="button" key={c.value} className={'color-choice'+(value===c.value?' selected':'')} aria-label={c.name} aria-pressed={value===c.value} onClick={()=>onChange(c.value)}>
   <span className="color-dot" style={{backgroundColor:c.value}}>{value===c.value&&<Check size={20}/>}</span><span>{c.name}</span>
  </button>)}</div>
  <label className="custom-color"><span>Muu värv</span><input type="color" value={value} onChange={e=>onChange(e.target.value.toUpperCase())}/></label>
  <p>Värv on sama kõigile seltsi liikmetele.</p>
 </fieldset>;
}

export function ObjectWidthPicker({value,color,onChange}:{value:number;color:string;onChange:(value:number)=>void}){
 return <fieldset className="object-width"><legend>Joone paksus</legend>
  <label><span>{value} px</span><input aria-label="Joone paksus pikslites" type="range" min="1" max="12" step="1" value={value} onChange={e=>onChange(Number(e.target.value))}/></label>
  <div className="width-presets">{[{name:'Peen',width:2},{name:'Tavaline',width:5},{name:'Paks',width:8}].map(x=><button key={x.width} type="button" aria-pressed={value===x.width} onClick={()=>onChange(x.width)}>{x.name}</button>)}</div>
  <div className="width-preview" aria-label={`Joone eelvaade, ${value} pikslit`}><span style={{height:value,backgroundColor:color,boxShadow:`0 0 0 1.5px ${colorOutline(color)}`}}/></div>
 </fieldset>;
}
