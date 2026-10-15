import {useEffect,useRef,useState} from 'react';
import {db} from '../api';
import {createRefreshRunner} from './reliability';

export type SyncState='connecting'|'synced'|'offline'|'error';

/** Keeps the active hunt fresh without trusting Realtime as the only source. */
export function useHuntRealtime(huntId:string,driveId:string,onChange:()=>Promise<void>){
 const callback=useRef(onChange);callback.current=onChange;
 const [syncState,setSyncState]=useState<SyncState>(navigator.onLine?'connecting':'offline');
 const [lastSyncAt,setLastSyncAt]=useState<number|null>(null);
 useEffect(()=>{
  if(!db||!huntId)return;
  let active=true,timer:number|null=null;
  setLastSyncAt(null);setSyncState(navigator.onLine?'connecting':'offline');
  const runner=createRefreshRunner(()=>callback.current(),()=>{setLastSyncAt(Date.now());setSyncState(navigator.onLine?'synced':'offline');},()=>setSyncState(navigator.onLine?'error':'offline'));
  const refresh=()=>{if(timer!==null)clearTimeout(timer);timer=window.setTimeout(()=>{if(!active)return;void runner.run();},180);};
  const channel=db.channel('hunt-operations-'+huntId)
   .on('postgres_changes',{event:'*',schema:'public',table:'hunts',filter:'id=eq.'+huntId},refresh)
   .on('postgres_changes',{event:'*',schema:'public',table:'hunt_drives',filter:'hunt_id=eq.'+huntId},refresh)
   .on('postgres_changes',{event:'*',schema:'public',table:'hunt_participants',filter:'hunt_id=eq.'+huntId},refresh)
   .on('postgres_changes',{event:'*',schema:'public',table:'hunt_locations',filter:'hunt_id=eq.'+huntId},refresh)
   .on('postgres_changes',{event:'*',schema:'public',table:'hunt_positions',filter:'drive_id=eq.'+driveId},refresh)
   .subscribe(status=>{if(!active)return;if(status==='SUBSCRIBED'){refresh();}else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')setSyncState('error');});
  const online=()=>{setSyncState(navigator.onLine?'connecting':'offline');if(navigator.onLine)refresh();};
  const visible=()=>{if(document.visibilityState==='visible')online();};
  document.addEventListener('visibilitychange',visible);
  if(navigator.onLine)refresh();
  window.addEventListener('online',online);window.addEventListener('offline',online);
  const fallback=window.setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine)refresh();},15000);
  return()=>{active=false;runner.dispose();document.removeEventListener('visibilitychange',visible);if(timer!==null)clearTimeout(timer);clearInterval(fallback);window.removeEventListener('online',online);window.removeEventListener('offline',online);void db?.removeChannel(channel);};
 },[huntId,driveId]);
 return {syncState,lastSyncAt};
}

