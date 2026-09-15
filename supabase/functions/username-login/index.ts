// Public login endpoint: credentials are authenticated by Supabase Auth itself.
// Never return a username/email mapping or log credentials/tokens.
const origins=new Set(['https://soouni.github.io','https://parnjoe-jahikaart.ojamaa.chatgpt.site']);
const encoder=new TextEncoder();
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
 if(origins.has(origin))headers['Access-Control-Allow-Origin']=origin;
 const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!origins.has(origin))return reply(403,{code:'forbidden'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{code:'method_not_allowed'});
 const fail=()=>reply(400,{code:'invalid_credentials'});
 try{
  if(Number(req.headers.get('content-length')||0)>8192)return fail();
  const raw=await req.text();if(raw.length>8192)return fail();
  const body=JSON.parse(raw),username=typeof body.username==='string'?body.username.trim().toLowerCase():'';
  if(!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(username)||typeof body.password!=='string'||!body.password||body.password.length>1024)return fail();
  const url=Deno.env.get('SUPABASE_URL')!;
  const secret=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const publicKey=JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||'{}').default||Deno.env.get('SUPABASE_ANON_KEY');
  if(!url||!secret||!publicKey)return reply(503,{code:'unavailable'});
  const serviceHeaders:Record<string,string>={apikey:secret,'Content-Type':'application/json'};
  if(!secret.startsWith('sb_secret_'))serviceHeaders.Authorization='Bearer '+secret;
  const hmac=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',hmac,encoder.encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  const budget=await fetch(url+'/rest/v1/rpc/consume_username_login_attempt',{method:'POST',headers:serviceHeaders,body:JSON.stringify({ip_hash:await hash('ip:'+ip),name_hash:await hash('name:'+username)}),signal:AbortSignal.timeout(8000)});
  if(!budget.ok)return reply(503,{code:'unavailable'});
  if(await budget.json()!==true)return reply(429,{code:'over_request_rate_limit'});
  const query=new URLSearchParams({select:'email,user_id',username:'eq.'+username,active:'eq.true',limit:'1'});
  const lookup=await fetch(url+'/rest/v1/memberships?'+query,{headers:serviceHeaders,signal:AbortSignal.timeout(8000)});
  if(!lookup.ok)return reply(503,{code:'unavailable'});
  const members=await lookup.json();const member=members[0];
  // Unknown usernames take the same Auth password-verification path.
  const email=member?.user_id?member.email:'missing-'+crypto.randomUUID()+'@example.invalid';
  const result=await fetch(url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:publicKey,'Content-Type':'application/json'},body:JSON.stringify({email,password:body.password}),signal:AbortSignal.timeout(10000)});
  if(result.status===429)return reply(429,{code:'over_request_rate_limit'});
  if(!result.ok)return fail();
  const session=await result.json();
  if(!member?.user_id||session.user?.id!==member.user_id||!session.user?.email_confirmed_at||!session.access_token||!session.refresh_token)return fail();
  return reply(200,{access_token:session.access_token,refresh_token:session.refresh_token});
 }catch{return reply(503,{code:'unavailable'});}
});
