import { createRemoteJWKSet, jwtVerify } from 'jose';
interface Env { CLINICAL_MEDIA: R2Bucket; FIREBASE_PROJECT_ID: string; }
const jwks=createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
async function authUser(request:Request,env:Env){
  const raw=request.headers.get('Authorization')?.replace(/^Bearer\s+/,''); if(!raw) throw new Error('missing_token');
  const {payload}=await jwtVerify(raw,jwks,{issuer:`https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,audience:env.FIREBASE_PROJECT_ID});
  if(!payload.sub) throw new Error('invalid_sub'); return {uid:payload.sub,token:raw};
}
async function hasMembership(env:Env,token:string,tenantId:string,uid:string){
  const url=`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/tenants/${encodeURIComponent(tenantId)}/memberships/${encodeURIComponent(uid)}`;
  const res=await fetch(url,{headers:{Authorization:`Bearer ${token}`}}); return res.ok;
}
export default { async fetch(request:Request,env:Env):Promise<Response>{
  const url=new URL(request.url); if(url.pathname==='/health') return Response.json({ok:true});
  try{
    const {uid,token}=await authUser(request,env);
    if(request.method==='POST' && url.pathname==='/v1/media'){
      const form=await request.formData(); const tenantId=String(form.get('tenantId')||''); const patientId=String(form.get('patientId')||''); const file=form.get('file');
      if(!tenantId||!patientId||!(file instanceof File)) return new Response('invalid_payload',{status:400});
      if(!(await hasMembership(env,token,tenantId,uid))) return new Response('forbidden',{status:403});
      const id=crypto.randomUUID(); const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_'); const objectKey=`tenants/${tenantId}/patients/${patientId}/${id}-${safe}`;
      await env.CLINICAL_MEDIA.put(objectKey,file.stream(),{httpMetadata:{contentType:file.type},customMetadata:{tenantId,patientId,uploaderId:uid}});
      return Response.json({objectKey});
    }
    return new Response('not_found',{status:404});
  }catch{return new Response('unauthorized',{status:401});}
}};
