// Avalik jahikoodi otspunkt. Külaline ei saa Supabase'i seanssi: funktsioon
// kontrollib koodi, piirab katseid ja väljastab ainult vaatamiseks mõeldud
// jahivaate. Koode ega pääsutähiseid ei logita.
const origins=new Set(['https://www.parnjoe.ee','https://parnjoe.ee','https://soouni.github.io','https://parnjoe-jahikaart.ojamaa.chatgpt.site']);
const encoder=new TextEncoder();
/** Kliendi aadress piirangu jaoks. `x-forwarded-for` esimest kirjet saab klient ise ette kirjutada, seega eelistatakse värava enda päist ja viimast kirjet; IPv6 ümardatakse /64 võrguni, sest üks seade saab seal vahetada aadressi vabalt. IPv4-ga kaardistatud IPv6 (`::ffff:1.2.3.4`) loetakse IPv4-ks ning port ja tsooni-id jäetakse ära. */
const clientAddress=(headers:Headers)=>{
 let raw=(headers.get('cf-connecting-ip')||headers.get('x-real-ip')||headers.get('x-forwarded-for')?.split(',').pop()||'').trim().toLowerCase();
 if(!raw||raw.length>64)return 'unknown';
 const bracketed=raw.match(/^\[([^\]]+)\](?::\d+)?$/);
 if(bracketed)raw=bracketed[1];
 else if(/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(raw))raw=raw.slice(0,raw.lastIndexOf(':'));
 raw=raw.split('%')[0];
 const dotted=raw.match(/^(?:::|(?:0{1,4}:){5})ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
 if(dotted)return dotted[1];
 if(!raw.includes(':'))return raw;
 const [head,tail=''] = raw.split('::');
 const first=head?head.split(':'):[],last=tail?tail.split(':'):[];
 const groups=(raw.includes('::')?[...first,...Array(Math.max(0,8-first.length-last.length)).fill('0'),...last]:first).map(g=>g?(parseInt(g,16)||0).toString(16):'0');
 if(groups.length===8&&groups.slice(0,5).every(g=>g==='0')&&groups[5]==='ffff'){const hi=parseInt(groups[6],16),lo=parseInt(groups[7],16);return [hi>>8,hi&255,lo>>8,lo&255].join('.');}
 return groups.slice(0,4).join(':')+'::/64';
};
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
 if(origins.has(origin))headers['Access-Control-Allow-Origin']=origin;
 const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!origins.has(origin))return reply(403,{code:'forbidden'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{code:'method_not_allowed'});
 try{
  if(Number(req.headers.get('content-length')||0)>2048)return reply(400,{code:'invalid_request'});
  const raw=await req.text();if(raw.length>2048)return reply(400,{code:'invalid_request'});
  let body:{action?:unknown;code?:unknown;token?:unknown};
  try{body=JSON.parse(raw);}catch{return reply(400,{code:'invalid_request'});}
  if(!body||typeof body!=='object')return reply(400,{code:'invalid_request'});
  const url=Deno.env.get('SUPABASE_URL')!;
  const secret=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!secret)return reply(503,{code:'unavailable'});
  const serviceHeaders:Record<string,string>={apikey:secret,'Content-Type':'application/json'};
  if(!secret.startsWith('sb_secret_'))serviceHeaders.Authorization='Bearer '+secret;
  const hmac=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',hmac,encoder.encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const rpc=(name:string,args:unknown)=>fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers:serviceHeaders,body:JSON.stringify(args),signal:AbortSignal.timeout(8000)});
  const sign=(codeId:string,expires:number)=>hash('guest:'+codeId+':'+expires);
  const snapshot=async(codeId:string)=>{const r=await rpc('hunt_guest_snapshot',{target_code_id:codeId});if(!r.ok)throw new Error('snapshot');return r.json();};

  if(body.action==='redeem'){
   const code=typeof body.code==='string'?body.code.trim():'';
   if(!/^[0-9]{4}$/.test(code))return reply(400,{code:'invalid_code'});
   const ip=clientAddress(req.headers);
   const result=await rpc('redeem_hunt_access_code',{submitted_code:code,ip_hash:await hash('ip:'+ip)});
   if(!result.ok)return reply(503,{code:'unavailable'});
   const outcome=await result.json();
   if(outcome?.status==='throttled')return reply(429,{code:'over_request_rate_limit'});
   // Kogu süsteemi piir: õigete koodidega külalised ootavad, kuni piir lõpeb; jahijuht saab neid suuliselt aidata.
   if(outcome?.status==='locked')return reply(429,{code:'temporarily_locked'});
   if(outcome?.status!=='ok'||typeof outcome.code_id!=='string'||!uuidPattern.test(outcome.code_id))return reply(400,{code:'invalid_code'});
   const expires=Math.floor(Date.parse(outcome.expires_at)/1000);
   if(!Number.isFinite(expires))return reply(503,{code:'unavailable'});
   const view=await snapshot(outcome.code_id);
   if(!view)return reply(400,{code:'invalid_code'});
   return reply(200,{token:['v1',outcome.code_id,expires,await sign(outcome.code_id,expires)].join('.'),snapshot:view});
  }

  if(body.action==='view'){
   const parts=typeof body.token==='string'&&body.token.length<200?body.token.split('.'):[];
   const [version,codeId,expiresText,signature]=parts;
   const expires=Number(expiresText);
   if(parts.length!==4||version!=='v1'||!uuidPattern.test(codeId)||!/^[0-9]{9,11}$/.test(expiresText)||!/^[a-f0-9]{64}$/.test(signature))return reply(401,{code:'guest_expired'});
   const expected=await sign(codeId,expires);
   let difference=0;for(let i=0;i<64;i++)difference|=expected.charCodeAt(i)^signature.charCodeAt(i);
   if(difference!==0||expires*1000<=Date.now())return reply(401,{code:'guest_expired'});
   // Tühistatud kood või lõpetatud jaht lõpetab vaate kohe, kuigi tähis on veel allkirjastatud.
   const view=await snapshot(codeId);
   if(!view)return reply(401,{code:'guest_expired'});
   return reply(200,{snapshot:view});
  }
  return reply(400,{code:'invalid_request'});
 }catch{return reply(503,{code:'unavailable'});}
});
