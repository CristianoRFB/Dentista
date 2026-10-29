import { collection, doc, runTransaction, serverTimestamp, where } from 'firebase/firestore';
import { auth, db } from './firebase';
import { createPersonalInviteUrl, readInviteToken } from './personalInviteUrl';
import type { PatientIntakeSubmission } from '../domain/types';
import { listTenantRecords } from './tenantData';
import { requirePermission, requireReady } from './tenantDataCore';
import type { TenantAccessState } from '../modules/tenant/tenantResolver';
import { canUse } from '../commercial/entitlementService';

const API = import.meta.env.VITE_CLINICAL_MEDIA_API_URL;

export type IntakeSubmission = PatientIntakeSubmission & {
  reviewedAt?: string; reviewedBy?: string; lastAuditLogId?: string;
};

function requireIntake(session: TenantAccessState, permission: string) {
  const ready = requireReady(session);
  requirePermission(ready, permission);
  if (!canUse(ready.tenant, 'intake_link')) throw new Error('Pré-cadastro indisponível para esta clínica.');
  return ready;
}

export async function issueIntakeLink(session: TenantAccessState) {
  const ready = requireIntake(session, 'intake.manage');
  if (ready.isDemo) throw new Error('Demo somente leitura.');
  if (!API) throw new Error('API clínica ainda não configurada.');
  const jwt = await auth.currentUser?.getIdToken();
  if (!jwt) throw new Error('Autenticação necessária.');
  const result = await fetch(API.replace(/\/$/,'') + '/v1/intake/tokens', {
    method: 'POST', headers: {'Authorization':'Bearer '+jwt,'Content-Type':'application/json'},
    body: JSON.stringify({tenantId:ready.tenant.id}),
  });
  if (!result.ok) throw new Error('Não foi possível criar o link. Verifique permissões e disponibilidade da API.');
  const data = await result.json() as { token: string; expiresAt: string };
  return {
    url: createPersonalInviteUrl(window.location.origin,ready.tenant.slug,'cadastro',data.token),
    expiresAt: data.expiresAt,
  };
}

export async function submitIntake(tenantSlug: string, token: string, data: {name:string;phone:string;email:string}) {
  if (!API) throw new Error('Pré-cadastro ainda não configurado.');
  const result = await fetch(API.replace(/\/$/,'') + '/v1/public/intake', {
    method: 'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({tenantSlug, token, ...data}),
  });
  if (result.status === 404 || result.status === 409) throw new Error('Link inválido, expirado ou já utilizado. Solicite outro à clínica.');
  if (result.status === 400) throw new Error('Confira nome, telefone e e-mail informados.');
  if (!result.ok) throw new Error('Não foi possível enviar. Tente novamente mais tarde.');
}

export async function listIntakeSubmissions(session: TenantAccessState): Promise<IntakeSubmission[]> {
  if (session.status === 'ready' && session.isDemo) return [];
  const ready = requireIntake(session, 'intake.read');
  const rows = await listTenantRecords<IntakeSubmission>(ready,'patientIntakeSubmissions',where('tenantId','==',ready.tenant.id));
  return rows.filter(row=>row.tenantId===ready.tenant.id)
    .sort((a,b)=>String(b.submittedAt).localeCompare(String(a.submittedAt)));
}

export async function reviewIntake(session:TenantAccessState, submissionId:string, decision:'approved'|'rejected') {
  const ready = requireIntake(session, 'intake.manage');
  if (ready.isDemo) throw new Error('Demo somente leitura.');
  const uid = ready.membership?.userId;
  if (!uid) throw new Error('Apenas equipe da clínica pode revisar pré-cadastros.');
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(submissionId)) throw new Error('Solicitação inválida.');
  const path = ['tenants',ready.tenant.id] as const;
  const entry = doc(db,...path,'patientIntakeSubmissions',submissionId);
  const audit = doc(collection(db,...path,'auditLogs'));
  await runTransaction(db, async tx=>{
    const current = await tx.get(entry);
    if (!current.exists() || current.data().tenantId !== ready.tenant.id
      || current.data().status !== 'pending_review') throw new Error('Solicitação já revisada ou de outra clínica.');
    tx.update(entry,{status:decision, reviewedBy:uid,reviewedAt:serverTimestamp(),lastAuditLogId:audit.id});
    tx.set(audit,{
      tenantId:ready.tenant.id,actorId:uid,actorRole:ready.membership!.role,
      action:'intake.review',resourceType:'intakeSubmission',resourceId:submissionId,
      timestamp:serverTimestamp(),
    });
  });
}

/** Revoke only unused contact-only invitations; does not modify a received submission. */
export async function revokeIntakeLink(session:TenantAccessState,url:string) {
  const ready=requireIntake(session,'intake.manage');
  if(ready.isDemo)throw new Error('Ambiente demonstrativo somente leitura.');
  if(!API)throw new Error('API clínica ainda não configurada.');
  const parsed=new URL(url);
  if(parsed.origin!==window.location.origin ||
    parsed.pathname!=='/'+encodeURIComponent(ready.tenant.slug)+'/cadastro')
    throw new Error('Link de outra clínica ou inválido.');
  const personalToken=readInviteToken(parsed);
  if(!personalToken)throw new Error('Convite sem token válido.');
  const jwt=await auth.currentUser?.getIdToken();
  if(!jwt)throw new Error('Autenticação necessária.');
  const response=await fetch(API.replace(/\/$/,'')+'/v1/intake/tokens/revoke',{
    method:'POST',headers:{Authorization:'Bearer '+jwt,'Content-Type':'application/json'},
    body:JSON.stringify({tenantId:ready.tenant.id,token:personalToken}),
  });
  if(response.status===409)throw new Error('Convite já utilizado ou revogado. Consulte a fila de revisão.');
  if(response.status===404)throw new Error('Convite não encontrado na clínica atual.');
  if(!response.ok)throw new Error('Não foi possível revogar o convite de pré-cadastro.');
  return true;
}
