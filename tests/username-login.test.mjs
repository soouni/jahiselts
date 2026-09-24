import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';
import ts from 'typescript';
const code=ts.transpileModule(readFileSync(new URL('../supabase/functions/username-login/index.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
function setup({allowed=true,passwordOK=true,member=true,matching=true}={}){
 let handler;const calls=[];
 const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_SECRET_KEYS:JSON.stringify({default:'sb_secret_fixture'}),SUPABASE_PUBLISHABLE_KEYS:JSON.stringify({default:'sb_publishable_fixture'})};
 runInNewContext(code,{Deno:{env:{get:k=>env[k]},serve:fn=>handler=fn},TextEncoder,Response,URLSearchParams,AbortSignal,crypto:webcrypto,fetch:async(url,init)=>{
  calls.push({url,init});
  if(url.includes('consume_username'))return Response.json(allowed);if(url.includes('clear_username_login_attempts'))return Response.json(null);
  if(url.includes('/memberships?'))return Response.json(member?[{email:'fixture@example.invalid',user_id:'test-user'}]:[]);
  if(url.includes('/auth/v1/token'))return passwordOK?Response.json({access_token:'test-access',refresh_token:'test-refresh',user:{id:matching?'test-user':'other-user',email_confirmed_at:'2026-01-01'}}):Response.json({error:'private auth error'},{status:400});
  throw Error('Unexpected endpoint');
 }});
 return {calls,run:(body={username:'Example',password:'test-password'},origin='https://soouni.github.io')=>handler(new Request('https://test.supabase.co/functions/v1/username-login',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)}))};
}
test('username login normalizes input and returns only authenticated session tokens',async()=>{const x=setup();const r=await x.run();assert.equal(r.status,200);assert.deepEqual(await r.json(),{access_token:'test-access',refresh_token:'test-refresh'});assert.ok(x.calls[1].url.includes('username=eq.example'));assert.equal(r.headers.get('Cache-Control'),'no-store');});
test('wrong password and unknown user never disclose the account email',async()=>{for(const opts of [{passwordOK:false},{member:false},{matching:false}]){const x=setup(opts);const r=await x.run();assert.equal(r.status,400);assert.deepEqual(await r.json(),{code:'invalid_credentials'});}});
test('rate limit stops lookup and authentication',async()=>{const x=setup({allowed:false});const r=await x.run();assert.equal(r.status,429);assert.equal(x.calls.length,1);});
test('foreign origin is rejected before credential lookup',async()=>{const x=setup();assert.equal((await x.run(undefined,'https://untrusted.invalid')).status,403);assert.equal(x.calls.length,0);});
