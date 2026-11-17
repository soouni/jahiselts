import {forwardRef,useImperativeHandle} from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {snapshot} from './fixtures';

const mapProps:Record<string,any>[]=[];
vi.mock('../../src/Map',()=>({
 MapCanvas:forwardRef((props:Record<string,any>,ref)=>{
  mapProps.push(props);
  useImperativeHandle(ref,()=>({fitHunt:()=>{},locate:()=>{},showGps:()=>{},clearGps:()=>{},offlineUrls:()=>[]}) as never);
  return <div data-testid="map"/>;
 })
}));
const fetchSnapshot=vi.fn();
vi.mock('../../src/guest/api',()=>({
 GuestError:class GuestError extends Error{code:string;constructor(code:string){super(code);this.code=code;}},
 fetchGuestSnapshot:(token:string)=>fetchSnapshot(token)
}));
const {GuestHunt}=await import('../../src/guest/GuestHunt');
const {GuestError}=await import('../../src/guest/api');

const show=(id:string|null,onExit=vi.fn())=>{render(<GuestHunt token="v1.test" initial={snapshot} initialPositionId={id} onExit={onExit}/>);return onExit;};
beforeEach(()=>{fetchSnapshot.mockResolvedValue(snapshot);localStorage.clear();mapProps.length=0;});
afterEach(()=>{cleanup();fetchSnapshot.mockReset();});

describe('GuestHunt',()=>{
 it('is view only: markers for every placed person, nothing draggable, nothing placeable',()=>{
  show('p2');
  const props=mapProps.at(-1)!;
  expect(props.huntMarkers.map((m:{id:string})=>m.id)).toEqual(['p1','p2','p3','p4']);
  expect(props.huntMarkers.find((m:{id:string})=>m.id==='p2').isMine).toBe(true);
  expect(props.huntCanDrag).toBe(false);
  props.onHuntPlace?.({});props.onHuntDrag?.({});
  expect(fetchSnapshot).toHaveBeenCalledWith('v1.test');
 });
 it('without a saved choice it asks for the name, then shows left and right neighbours',()=>{
  show(null);
  expect(screen.getByRole('heading',{name:'Vali oma nimi'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:/K2.*Jaan T\./}));
  expect(screen.getByText('Sinu koht: K2')).toBeTruthy();
  expect(screen.getByText(/^Vasakul: Mari M\. \(K1,/)).toBeTruthy();
  expect(screen.getByText(/^Paremal: Peeter K\. \(K3,/)).toBeTruthy();
 });
 it('says plainly when the hunter stands at the end of the line',()=>{
  show('p1');
  expect(screen.getByText('Vasakul: pole kedagi, oled liini otsas')).toBeTruthy();
  expect(screen.getByText(/^Paremal: Jaan T\./)).toBeTruthy();
 });
 it('drivers are shown with their entry point and get no hunter neighbours',()=>{
  show('p4');
  expect(screen.getByText('Sinu sisenemiskoht: K4')).toBeTruthy();
  expect(screen.getByText(/Ajaja koeraga · siit lähed ajusse/)).toBeTruthy();
  expect(screen.queryByText(/^Vasakul/)).toBeNull();
 });
 it('remembers the view on the device without storing anything but the view and token',async()=>{
  show('p2');
  await waitFor(()=>expect(localStorage.getItem('parnjoe-jahikood-v1')).toBeTruthy());
  const saved=JSON.parse(localStorage.getItem('parnjoe-jahikood-v1')!);
  expect(saved.token).toBe('v1.test');expect(saved.myPositionId).toBe('p2');expect(Object.keys(saved).sort()).toEqual(['myPositionId','savedAt','snapshot','token']);
 });
 it('closes the view with a notice when the code is revoked or the hunt is finished',async()=>{
  fetchSnapshot.mockRejectedValue(new GuestError('guest_expired'));
  const onExit=show('p2');
  await waitFor(()=>expect(onExit).toHaveBeenCalledWith(expect.stringMatching(/aegunud või jaht on lõpetatud/)));
 });
 it('keeps showing the saved view when the network fails',async()=>{
  fetchSnapshot.mockRejectedValue(new GuestError('network'));
  const onExit=show('p2');
  await waitFor(()=>expect(screen.getByText(/Salvestatud vaade/)).toBeTruthy());
  expect(onExit).not.toHaveBeenCalled();
 });
 it('uses plain labels in the map tools',()=>{
  show('p2');
  expect(screen.getByRole('button',{name:/Salvesta aju ala kaart võrguta/}).textContent).toBe('Salvesta kaart');
  expect(screen.getByText('Kaart ei asenda jahijuhi ohutusjuhiseid.')).toBeTruthy();
 });
});
