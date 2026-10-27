import { auth } from './firebase';
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
    url:window.location.origin+'/'+encodeURIComponent(ready.tenant.slug)+'/agendar?token='+encodeURIComponent(result.token),
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
