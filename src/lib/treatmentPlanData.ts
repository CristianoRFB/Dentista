import { collection, doc, getDocs, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore';
import { canUse } from '../commercial/entitlementService';
import type { TenantAccessState } from '../modules/tenant/tenantResolver';
import { auth, db } from './firebase';
import { listTenantRecords } from './tenantData';
import { requirePermission, requireReady } from './tenantDataCore';
import {
  canTransitionTreatment, treatmentTotalCents, validateTreatmentVersion,
  type TreatmentItem, type TreatmentPlan, type TreatmentPlanVersion, type TreatmentStatus,
} from '../domain/treatmentPlan';

function actor(session: Extract<TenantAccessState, {status:'ready'}>) {
  const id = session.membership?.userId ?? (session.isPlatformOwner ? auth.currentUser?.uid : undefined);
  if (!id) throw new Error('Sessão clínica autenticada obrigatória.');
  return { actorId:id, actorRole: session.membership?.role ?? 'platform_owner' };
}
function readyToWrite(session: TenantAccessState) {
  const ready = requireReady(session);
  requirePermission(ready,'treatment.write');
  if (!canUse(ready.tenant,'treatment_plans')) throw new Error('Plano de tratamento indisponível.');
  return ready;
}
function normalize<T>(data: T): T {
  const out = {...data} as Record<string,unknown>;
  for(const key of ['createdAt','updatedAt']) {
    if(out[key] instanceof Timestamp) out[key] = (out[key] as Timestamp).toDate().toISOString();
  }
  return out as T;
}
export async function listTreatmentPlans(session: TenantAccessState): Promise<TreatmentPlan[]> {
  const ready = requireReady(session);
  requirePermission(ready,'clinical.read');
  return listTenantRecords<TreatmentPlan>(ready, 'treatmentPlans');
}
export async function listTreatmentVersions(session: TenantAccessState, planId: string): Promise<TreatmentPlanVersion[]> {
  const ready = requireReady(session);
  requirePermission(ready,'clinical.read');
  if(!/^[a-zA-Z0-9:_-]{1,128}$/.test(planId)) throw new Error('Plano inválido.');
  const snap = await getDocs(collection(db,'tenants',ready.tenant.id,'treatmentPlans',planId,'versions'));
  return snap.docs.map(x=>normalize({...x.data(),id:x.id} as TreatmentPlanVersion))
    .sort((a,b)=>a.version-b.version);
}

function validateQuoteGate(ready: Extract<TenantAccessState,{status:'ready'}>, quoteEnabled:boolean) {
  if(quoteEnabled && !canUse(ready.tenant,'quotes')) throw new Error('Orçamentos são um recurso do Pro/Premium.');
}
export async function createTreatmentPlan(session:TenantAccessState, patientId:string, professionalId:string, draft:{
  items:TreatmentItem[]; note:string; quoteEnabled:boolean; appointmentId?:string;
}) {
  const ready=readyToWrite(session);
  const values=validateTreatmentVersion(draft);
  validateQuoteGate(ready,values.quoteEnabled);
  treatmentTotalCents(values.items,values.quoteEnabled);
  const {actorId,actorRole}=actor(ready);
  const tenantId=ready.tenant.id;
  const planRef=doc(collection(db,'tenants',tenantId,'treatmentPlans'));
  const versionRef=doc(collection(db,'tenants',tenantId,'treatmentPlans',planRef.id,'versions'));
  const auditRef=doc(collection(db,'tenants',tenantId,'auditLogs'));
  await runTransaction(db,async tx=>{
    const patientRef=doc(db,'tenants',tenantId,'patients',patientId);
    const professionalRef=doc(db,'tenants',tenantId,'professionals',professionalId);
    const refs=[patientRef,professionalRef,...[...new Set(values.items.map(item=>item.procedureId))].map(id=>doc(db,'tenants',tenantId,'procedures',id))];
    const appointmentRef=values.appointmentId?doc(db,'tenants',tenantId,'appointments',values.appointmentId):null;
    const snapshots=await Promise.all([...refs,...(appointmentRef?[appointmentRef]:[])].map(ref=>tx.get(ref)));
    if (!snapshots[0].exists()||snapshots[0].data().tenantId!==tenantId||snapshots[0].data().status!=='active') throw new Error('Paciente indisponível nesta clínica.');
    if (!snapshots[1].exists()||snapshots[1].data().tenantId!==tenantId||snapshots[1].data().status!=='active') throw new Error('Profissional indisponível nesta clínica.');
    for (let i=2;i<refs.length;i++) if(!snapshots[i].exists()||snapshots[i].data().tenantId!==tenantId||snapshots[i].data().active!==true) throw new Error('Procedimento inativo ou de outra clínica.');
    if(appointmentRef) {
      const appt=snapshots.at(-1);
      if(!appt || !appt.exists()||appt.data().tenantId!==tenantId||appt.data().patientId!==patientId||appt.data().professionalId!==professionalId) throw new Error('Agendamento não pertence ao paciente/profissional.');
    }
    tx.set(planRef,{id:planRef.id,tenantId,patientId,professionalId,currentVersion:1,versionId:versionRef.id,status:'draft',
      createdBy:actorId,createdAt:serverTimestamp(),lastAuditLogId:auditRef.id});
    tx.set(versionRef,{...values,id:versionRef.id,planId:planRef.id,tenantId,patientId,version:1,
      status:'draft',createdBy:actorId,createdAt:serverTimestamp(),auditLogId:auditRef.id});
    tx.set(auditRef,{tenantId,actorId,actorRole,action:'treatment_plan.create',resourceType:'treatmentPlan',
      resourceId:planRef.id,timestamp:serverTimestamp()});
  });
  return planRef.id;
}
export async function updateTreatmentPlan(session:TenantAccessState,plan:TreatmentPlan,
  draft:{items:TreatmentItem[];note:string;quoteEnabled:boolean;appointmentId?:string},status:TreatmentStatus) {
  const ready=readyToWrite(session);
  if(plan.tenantId!==ready.tenant.id) throw new Error('Plano de outra clínica.');
  if(!canTransitionTreatment(plan.status,status)) throw new Error('Mudança de etapa inválida.');
  const values=validateTreatmentVersion(draft);
  validateQuoteGate(ready,values.quoteEnabled);
  treatmentTotalCents(values.items,values.quoteEnabled);
  const {actorId,actorRole}=actor(ready);
  const tenantId=ready.tenant.id;
  const root=doc(db,'tenants',tenantId,'treatmentPlans',plan.id);
  const audit=doc(collection(db,'tenants',tenantId,'auditLogs'));
  await runTransaction(db,async tx=>{
    const current=await tx.get(root);
    if(!current.exists()||current.data().tenantId!==tenantId||current.data().patientId!==plan.patientId||
      current.data().currentVersion!==plan.currentVersion||current.data().status!==plan.status) throw new Error('Plano alterado. Atualize antes de editar.');
    const priorRef=doc(db,'tenants',tenantId,'treatmentPlans',plan.id,'versions',plan.versionId);
    const previous=await tx.get(priorRef);
    if(!previous.exists()) throw new Error('Histórico do plano indisponível.');
    const was=previous.data() as TreatmentPlanVersion;
    if (plan.status!=='draft') {
      if(was.quoteEnabled!==values.quoteEnabled||was.items.length!==values.items.length||
        was.items.some((item,i)=>['procedureId','description','toothId','quantity','unitPriceCents'].some(key=>
          item[key as keyof TreatmentItem]!==values.items[i][key as keyof TreatmentItem]))) throw new Error('Itens aprovados são imutáveis; registre novo plano para rever valores.');
    }
    const version=plan.currentVersion+1;
    const nextRef=doc(collection(db,'tenants',tenantId,'treatmentPlans',plan.id,'versions'));
    tx.update(root,{currentVersion:version,versionId:nextRef.id,status,lastAuditLogId:audit.id,updatedAt:serverTimestamp()});
    tx.set(nextRef,{...values,id:nextRef.id,planId:plan.id,tenantId,patientId:plan.patientId,
      version,status,createdBy:actorId,createdAt:serverTimestamp(),auditLogId:audit.id});
    tx.set(audit,{tenantId,actorId,actorRole,action:'treatment_plan.revise',resourceType:'treatmentPlan',
      resourceId:plan.id,timestamp:serverTimestamp()});
  });
}
