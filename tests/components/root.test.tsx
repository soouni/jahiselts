import {forwardRef} from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,render,screen,waitFor} from '@testing-library/react';
import {snapshot} from './fixtures';

const getSession=vi.fn();
vi.mock('../../src/api',()=>({db:{auth:{getSession:()=>getSession()}}}));
vi.mock('../../src/App',()=>({App:(p:{startLogin?:boolean})=><div data-testid="app">{p.startLogin?'login':'app'}</div>}));
vi.mock('../../src/Map',()=>({MapCanvas:forwardRef(()=><div data-testid="map"/>)}));
vi.mock('../../src/guest/api',()=>({
 guestAvailable:true,
 GuestError:class GuestError extends Error{code:string;constructor(code:string){super(code);this.code=code;}},
 redeemHuntCode:vi.fn(),
 fetchGuestSnapshot:()=>Promise.resolve(snapshot)
}));
const {Root}=await import('../../src/Root');
const {saveGuestSession}=await import('../../src/guest/session');

beforeEach(()=>{localStorage.clear();history.replaceState(null,'','/');});
afterEach(()=>{cleanup();getSession.mockReset();});

describe('Root',()=>{
 it('opens on the hunt code entry when nobody is signed in',async()=>{
  getSession.mockResolvedValue({data:{session:null}});
  render(<Root/>);
  expect(await screen.findByRole('heading',{name:'Sisesta jahikood'})).toBeTruthy();
  expect(screen.queryByTestId('app')).toBeNull();
 });
 it('goes straight to the account app when a session exists',async()=>{
  getSession.mockResolvedValue({data:{session:{}}});
  render(<Root/>);
  expect((await screen.findByTestId('app')).textContent).toBe('app');
 });
 it('resumes a saved guest hunt view without asking for the code again',async()=>{
  saveGuestSession(localStorage,{token:'v1.test',snapshot,savedAt:Date.now(),myPositionId:'p2'});
  getSession.mockResolvedValue({data:{session:null}});
  render(<Root/>);
  await waitFor(()=>expect(screen.getByText(/Laupäevane jaht/)).toBeTruthy());
  expect(screen.queryByRole('heading',{name:'Sisesta jahikood'})).toBeNull();
 });
 it('leaders reach the sign-in from the code entry',async()=>{
  getSession.mockResolvedValue({data:{session:null}});
  render(<Root/>);
  (await screen.findByRole('button',{name:/Jahijuht või admin/})).click();
  expect((await screen.findByTestId('app')).textContent).toBe('login');
 });
});
