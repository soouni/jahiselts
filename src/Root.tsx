import {useEffect,useState} from 'react';
import {LoaderCircle} from 'lucide-react';
import {db} from './api';
import {App} from './App';
import {CodeGate} from './guest/CodeGate';
import {GuestHunt} from './guest/GuestHunt';
import {readGuestSession,saveGuestSession,clearGuestSession,type GuestSession} from './guest/session';
import {readLastOfflinePosition} from './hunt/offlinePosition';
/** Valib avalehe: jahikoodi sisestus, külalise jahivaade või kontoga rakendus. */
export function Root(){
 const [guest,setGuest]=useState<GuestSession|null>(()=>readGuestSession(localStorage));
 const [mode,setMode]=useState<'checking'|'gate'|'app'>('checking'),[startLogin,setStartLogin]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>{
  // E-kirja lingiga sisenemine ja võrguta salvestatud jahikoht kuuluvad kontoga vaatesse.
  if(!db||/access_token=|[?&]code=|error=/.test(location.hash+location.search)||(!navigator.onLine&&readLastOfflinePosition(localStorage))){setMode(db?'app':'gate');return;}
  let alive=true;db.auth.getSession().then(({data})=>{if(alive)setMode(data.session?'app':'gate');}).catch(()=>{if(alive)setMode('gate');});return()=>{alive=false;};
 },[]);
 if(guest)return <GuestHunt token={guest.token} initial={guest.snapshot} initialPositionId={guest.myPositionId} onExit={message=>{clearGuestSession(localStorage);setGuest(null);setNotice(message||'');setMode('gate');}}/>;
 if(mode==='checking')return <main className="code-gate" aria-busy="true"><LoaderCircle className="spin" aria-label="Laadin"/></main>;
 if(mode==='app')return <App startLogin={startLogin} onCodeEntry={()=>{setStartLogin(false);setMode('gate');}}/>;
 return <CodeGate notice={notice} onGuest={(token,snapshot)=>{const session={token,snapshot,savedAt:Date.now(),myPositionId:null};saveGuestSession(localStorage,session);setNotice('');setGuest(session);}} onLogin={()=>{setStartLogin(true);setMode('app');}} onPublicMap={()=>{setStartLogin(false);setMode('app');}}/>;
}
