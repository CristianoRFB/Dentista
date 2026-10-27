import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import type { Recall, RecallStatus } from '../domain/types';
import type { TenantAccessState } from '../modules/tenant/tenantResolver';
import { db } from './firebase';
import { requireRecallAccess, validateRecallForm, validateRecallTransition } from './recallValidation';

type RecallDraft = { patientId: string; reason: string; dueAt: string };
type RecallUpdate = { reason: string; dueAt: string; status: RecallStatus; appointmentId?: string };

function recallRefs(session: Extract<TenantAccessState, { status: 'ready' }>, id: string) {
  const parent = ['tenants', session.tenant.id];
  return {
    recall: doc(db, ...parent, 'recalls', id),
    audit: doc(collection(db, ...parent, 'auditLogs')),
  };
}

export async function createRecall(session: TenantAccessState, draft: RecallDraft) {
  const ready = requireRecallAccess(session, true);
  const values = validateRecallForm(draft);
  const actorId = ready.membership?.userId;
  if (!actorId) throw new Error('Uma membership de equipe ativa é necessária.');
  const id = doc(collection(db, 'tenants', ready.tenant.id, 'recalls')).id;
  const { recall, audit } = recallRefs(ready, id);
  const patient = doc(db, 'tenants', ready.tenant.id, 'patients', values.patientId);
  await runTransaction(db, async tx => {
    const patientSnapshot = await tx.get(patient);
    if (!patientSnapshot.exists() || patientSnapshot.data().tenantId !== ready.tenant.id || patientSnapshot.data().status !== 'active') {
      throw new Error('Paciente não está ativo nesta clínica.');
    }
    tx.set(recall, {
      ...values, id, tenantId: ready.tenant.id, status: 'planned',
      createdBy: actorId, createdAt: serverTimestamp(), lastAuditLogId: audit.id,
    });
    tx.set(audit, {
      tenantId: ready.tenant.id, actorId, actorRole: ready.membership!.role,
      action: 'recall.create', resourceType: 'recall', resourceId: id, timestamp: serverTimestamp(),
    });
  });
  return id;
}

export async function updateRecall(session: TenantAccessState, current: Recall, update: RecallUpdate) {
  const ready = requireRecallAccess(session, true);
  const actorId = ready.membership?.userId;
  if (!actorId) throw new Error('Uma membership de equipe ativa é necessária.');
  if (current.tenantId !== ready.tenant.id) throw new Error('O retorno não pertence à clínica atual.');
  const values = validateRecallForm({ patientId: current.patientId, reason: update.reason, dueAt: update.dueAt });
  validateRecallTransition(current.status, update.status, update.appointmentId);
  const { recall, audit } = recallRefs(ready, current.id);
  const appointment = update.appointmentId ? doc(db, 'tenants', ready.tenant.id, 'appointments', update.appointmentId) : null;
  await runTransaction(db, async tx => {
    const currentSnapshot = await tx.get(recall);
    if (!currentSnapshot.exists() || currentSnapshot.data().tenantId !== ready.tenant.id || currentSnapshot.data().patientId !== current.patientId) {
      throw new Error('Retorno não encontrado neste tenant.');
    }
    const stored = currentSnapshot.data() as Recall;
    if (stored.status !== current.status) throw new Error('Este retorno mudou. Atualize a lista antes de editar.');
    validateRecallTransition(stored.status, update.status, update.appointmentId);
    if (appointment) {
      const booked = await tx.get(appointment);
      if (!booked.exists() || booked.data().tenantId !== ready.tenant.id || booked.data().patientId !== current.patientId ||
        ['cancelled', 'no_show'].includes(booked.data().status)) throw new Error('Agendamento inválido para o paciente.');
    }
    const lastContactAt = update.status === 'contacted' && stored.status !== 'contacted'
      ? serverTimestamp() : stored.lastContactAt ?? null;
    tx.update(recall, {
      reason: values.reason, dueAt: values.dueAt, status: update.status,
      appointmentId: update.appointmentId ?? null, lastContactAt,
      updatedAt: serverTimestamp(), lastAuditLogId: audit.id,
    });
    tx.set(audit, {
      tenantId: ready.tenant.id, actorId, actorRole: ready.membership!.role,
      action: 'recall.update', resourceType: 'recall', resourceId: current.id, timestamp: serverTimestamp(),
    });
  });
}

export function recallDisplayStatus(recall: Recall, now = Date.now()): RecallStatus {
  if (recall.status === 'planned' && Date.parse(recall.dueAt) < now) return 'due';
  return recall.status;
}
