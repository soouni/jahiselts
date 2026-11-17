import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {snapshot} from './fixtures';

const redeem=vi.fn();
vi.mock('../../src/guest/api',()=>({
 guestAvailable:true,
 GuestError:class GuestError extends Error{code:string;constructor(code:string){super(code);this.code=code;}},
 redeemHuntCode:(code:string)=>redeem(code)
}));
const {CodeGate}=await import('../../src/guest/CodeGate');
const {GuestError}=await import('../../src/guest/api');

const setup=()=>{const handlers={onGuest:vi.fn(),onLogin:vi.fn(),onPublicMap:vi.fn()};render(<CodeGate {...handlers}/>);return handlers;};
const input=()=>screen.getByLabelText('Jahikood') as HTMLInputElement;
afterEach(()=>{cleanup();redeem.mockReset();});

describe('CodeGate',()=>{
 it('keeps only digits, at most four, and stays disabled until the code is complete',()=>{
  setup();
  fireEvent.change(input(),{target:{value:'1a2'}});
  expect(input().value).toBe('12');
  expect((screen.getByRole('button',{name:/Ava jaht/}) as HTMLButtonElement).disabled).toBe(true);
  expect(redeem).not.toHaveBeenCalled();
 });
 it('submits by itself at the fourth digit and hands the token and view on',async()=>{
  redeem.mockResolvedValue({token:'v1.test',snapshot});
  const h=setup();
  fireEvent.change(input(),{target:{value:'48271'}});
  await waitFor(()=>expect(h.onGuest).toHaveBeenCalledWith('v1.test',snapshot));
  expect(redeem).toHaveBeenCalledOnce();expect(redeem).toHaveBeenCalledWith('4827');
 });
 it('says why a wrong code failed, clears the field and keeps it announced for screen readers',async()=>{
  redeem.mockRejectedValue(new GuestError('invalid_code'));
  const h=setup();
  fireEvent.change(input(),{target:{value:'1357'}});
  const alert=await screen.findByRole('alert');
  expect(alert.textContent).toMatch(/vale või aegunud/);
  expect(input().value).toBe('');expect(input().getAttribute('aria-invalid')).toBe('true');
  expect(h.onGuest).not.toHaveBeenCalled();
 });
 it('tells a device lock apart from a system-wide lock',async()=>{
  redeem.mockRejectedValueOnce(new GuestError('over_request_rate_limit'));
  setup();fireEvent.change(input(),{target:{value:'1357'}});
  expect((await screen.findByRole('alert')).textContent).toMatch(/seadmest.*15 minutit/);
  redeem.mockRejectedValueOnce(new GuestError('temporarily_locked'));
  fireEvent.change(input(),{target:{value:'1358'}});
  await waitFor(()=>expect(screen.getByRole('alert').textContent).toMatch(/hetkeks suletud.*jahijuhilt/));
 });
 it('offers account sign-in for hunt leaders and the public map without a code',()=>{
  const h=setup();
  fireEvent.click(screen.getByRole('button',{name:/Jahijuht või admin/}));fireEvent.click(screen.getByRole('button',{name:/avalikku jahiala kaarti/}));
  expect(h.onLogin).toHaveBeenCalledOnce();expect(h.onPublicMap).toHaveBeenCalledOnce();
 });
});
