/**
 * D4 — anonymous appointment interest (NOT a confirmed reservation).
 * No medical narrative is accepted; reception must review all submissions.
 */
export const OPEN_BOOKING_ACTION='open_booking_request';
const SLUG=/^[a-z0-9](?:[a-z0-9-]{0,60}[a-z0-9])?$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
export interface OpenBookingRequest {
  tenantSlug:string;name:string;phone:string;email:string;preferredAt:string;turnstileToken:string;contactAcknowledged:true;
}
export function validateOpenBookingRequest(body:unknown, now=Date.now()):OpenBookingRequest {
  if(!body||typeof body!=='object'||Array.isArray(body))throw Error('invalid_open_booking');
  const v=body as Record<string,unknown>;
  if(Object.keys(v).some(x=>!['tenantSlug','name','phone','email','preferredAt','turnstileToken','contactAcknowledged'].includes(x)))
    throw Error('invalid_open_booking');
  const {tenantSlug,name,phone,email,preferredAt,turnstileToken,contactAcknowledged}=v;
  if(typeof tenantSlug!=='string'||!SLUG.test(tenantSlug)||
    typeof name!=='string'||name.trim().length<2||name.length>160||
    typeof phone!=='string'||phone.length>24||!(phone.replace(/\D/g,'').length>=10 && phone.replace(/\D/g,'').length<=13)||
    typeof email!=='string'||email.length>254||Boolean(email)&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||
    typeof preferredAt!=='string'||!UTC.test(preferredAt)||
    typeof turnstileToken!=='string'||turnstileToken.length<20||turnstileToken.length>2048||
    contactAcknowledged!==true)
    throw Error('invalid_open_booking');
  const time=Date.parse(preferredAt);
  if(!Number.isFinite(time)||new Date(time).toISOString()!==preferredAt ||
    time<now+5*60*1000||time>now+60*24*60*60*1000)
    throw Error('invalid_open_booking');
  return {tenantSlug,name:name.trim(),phone:phone.trim(),email:email.trim().toLowerCase(),
    preferredAt,turnstileToken,contactAcknowledged:true};
}
export interface RateLimitBinding {limit(args:{key:string}):Promise<{success:boolean}>}
export function trustedClientIp(request:Request){
  const ip=request.headers.get('CF-Connecting-IP');
  if(!ip||ip.length>64||!/^[0-9a-fA-F.:]{3,64}$/.test(ip))throw Error('client_ip_unavailable');
  return ip;
}

export async function verifyOpenBookingTurnstile(
  token:string,secret:string,ip:string,allowedOrigins:string[],
  verifier:typeof fetch=fetch,
):Promise<boolean>{
  if(!secret||!token||!allowedOrigins.length)return false;
  const data=new URLSearchParams({secret,response:token,remoteip:ip});
  try{
    const res=await verifier('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
      method:'POST',body:data,
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
    });
    if(!res.ok)return false;
    const verdict=await res.json() as {success?:boolean;hostname?:string;action?:string};
    return verdict.success===true&&verdict.action===OPEN_BOOKING_ACTION &&
      typeof verdict.hostname==='string' &&
      allowedOrigins.some(item=>{try{return new URL(item).hostname===verdict.hostname;}catch{return false;}});
  }catch{return false;}
}
