import { auth } from './firebase';
import { createPersonalInviteUrl, readInviteToken } from './personalInviteUrl';
import type { TenantAccessState } from '../modules/tenant/tenantResolver';
import { requirePermission, requireReady } from './tenantDataCore';
import { canUse } from '../commercial/entitlementService';

const BASE=import.meta.env.VITE_CLINICAL_MEDIA_API_URL;

export async function issueBookingLink(session:TenantAccessState,data:{
  patientId:string;professionalId:string;procedureId:string;resourceId?:string;durationMinutes:30|60;
}){
  const ready=requireReady(session);
  requirePermission(ready,'appointments.manage');
  if(!canUse(ready.tenant,'agenda'))throw new Error('Agenda indisponível para a clínica.');
  if(!BASE)throw new Error('API de agenda ainda não configurada.');
  const token=await auth.currentUser?.getIdToken();
  if(!token)throw new Error('Autenticação obrigatória.');
  const response=await fetch(BASE.replace(/\/$/,'')+'/v1/booking/tokens',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({tenantId:ready.tenant.id,...data}),
  });
  if(!response.ok)throw new Error('Não foi possível emitir o convite. Confira os cadastros e a API.');
  const result=await response.json() as {token:string;expiresAt:string};
  return {
    url:createPersonalInviteUrl(window.location.origin,ready.tenant.slug,'agendar',result.token),
    expiresAt:result.expiresAt,
  };
}

export async function submitPublicBooking(tenantSlug:string,token:string,startsAt:string){
  if(!BASE)throw new Error('Agenda online ainda não configurada.');
  const response=await fetch(BASE.replace(/\/$/,'')+'/v1/public/booking',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({tenantSlug,token,startsAt}),
  });
  if(response.status===404)throw new Error('Convite inválido, expirado ou já utilizado. Solicite outro à clínica.');
  if(response.status===409)throw new Error('Este horário está ocupado. Selecione outro horário e tente novamente.');
  if(response.status===400)throw new Error('Horário inválido. Escolha uma data futura.');
  if(!response.ok)throw new Error('Não foi possível reservar. Tente novamente.');
  return response.json() as Promise<{booked:boolean;startsAt:string;status:string}>;
}

/** Disables an unused invitation. This does not cancel any confirmed appointment. */
export async function revokeBookingLink(session:TenantAccessState,url:string) {
  const ready=requireReady(session);
  requirePermission(ready,'appointments.manage');
  if(ready.isDemo)throw new Error('A demonstração não permite revogar convites reais.');
  if(!BASE)throw new Error('API de agenda ainda não configurada.');
  const parsed=new URL(url);
  if(parsed.origin!==window.location.origin ||
    parsed.pathname!=='/'+encodeURIComponent(ready.tenant.slug)+'/agendar')
    throw new Error('Link não pertence à clínica atual.');
  const personalToken=readInviteToken(parsed);
  if(!personalToken)throw new Error('Link inválido ou sem token individual.');
  const authToken=await auth.currentUser?.getIdToken();
  if(!authToken)throw new Error('Autenticação obrigatória.');
  const response=await fetch(BASE.replace(/\/$/,'')+'/v1/booking/tokens/revoke',{
    method:'POST',headers:{Authorization:'Bearer '+authToken,'Content-Type':'application/json'},
    body:JSON.stringify({tenantId:ready.tenant.id,token:personalToken}),
  });
  if(response.status===409)throw new Error('O convite já foi utilizado ou revogado; consulte a agenda antes de agir.');
  if(response.status===404)throw new Error('Convite não encontrado na clínica.');
  if(!response.ok)throw new Error('Não foi possível revogar o convite.');
  return true;
}


/** No anonymous reservation: this sends contact interest to a protected review queue. */
export async function submitOpenBookingRequest(data:{
  tenantSlug:string;name:string;phone:string;email:string;preferredAt:string;turnstileToken:string;
}){
  if(!BASE)throw new Error('API pública de solicitações ainda não configurada.');
  const r=await fetch(BASE.replace(/\/$/,'')+'/v1/public/booking-requests',{
    method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',
    body:JSON.stringify(data),
  });
  if(r.status===429)throw Error('Muitas solicitações neste momento. Tente mais tarde.');
  if(r.status===403)throw Error('Verificação humana recusada. Atualize o desafio e tente novamente.');
  if(r.status===404)throw Error('A clínica não habilitou solicitações online.');
  if(r.status===503)throw Error('Proteção de agendamentos indisponível. Contate a clínica diretamente.');
  if(r.status===400)throw Error('Confira os dados e o horário informado.');
  if(!r.ok)throw Error('Solicitação não recebida ('+r.status+').');
  return r.json() as Promise<{received:true;notConfirmed:true}>;
}
