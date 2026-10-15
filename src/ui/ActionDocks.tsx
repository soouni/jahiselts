import {Ellipsis,Layers,LoaderCircle,LocateFixed,Navigation,Plus,Ruler,Search,Users,Wind} from 'lucide-react';

type MapActionDockProps={
 canAdd:boolean;
 locating:boolean;
 filtersActive:boolean;
 onSearch:()=>void;
 onContent:()=>void;
 onAdd:()=>void;
 onLocate:()=>void;
 onMeasure:()=>void;
};

export function MapActionDock({canAdd,locating,filtersActive,onSearch,onContent,onAdd,onLocate,onMeasure}:MapActionDockProps){
 return <nav className="bottomnav" aria-label="Kaardi tööriistad">
  <button onClick={onSearch}><Search/><span>Otsi</span></button>
  <button onClick={onContent}><Layers/><span>Sisu</span>{filtersActive&&<i/>}</button>
  {canAdd?<button className="add" onClick={onAdd}><Plus/><span>Lisa</span></button>:<button onClick={onLocate} disabled={locating}>{locating?<LoaderCircle className="spin"/>:<LocateFixed/>}<span>Asukoht</span></button>}
  <button onClick={onMeasure}><Ruler/><span>Mõõda</span></button>
 </nav>;
}

type HuntActionDockProps={
 active:'position'|'participants'|'weather'|'more'|null;
 positionLabel:string;
 distanceLabel?:string;
 onParticipants:()=>void;
 onPosition:()=>void;
 onWeather:()=>void;
 onMore:()=>void;
};

export function HuntActionDock({active,positionLabel,distanceLabel,onParticipants,onPosition,onWeather,onMore}:HuntActionDockProps){
 return <nav className="bottomnav hunt-dock" aria-label="Jahirežiimi tööriistad">
  <button aria-pressed={active==='participants'} onClick={onParticipants}><Users/><span>Osalejad</span></button>
  <button className="add" aria-label={`GPS ja minu jahikoht: ${positionLabel}`} aria-pressed={active==='position'} onClick={onPosition}><Navigation/><span>GPS</span><small>{distanceLabel||positionLabel}</small></button>
  <button aria-pressed={active==='weather'} onClick={onWeather}><Wind/><span>Tuul</span></button>
  <button aria-pressed={active==='more'} onClick={onMore}><Ellipsis/><span>Rohkem</span></button>
 </nav>;
}
