import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import type { OdontogramEvent } from '../domain/types';
import { validateOdontogramInput } from '../domain/odontogram';
import { canUse } from '../commercial/entitlementService';
import type { TenantAccessState } from '../modules/tenant/tenantResolver';
import { auth, db } from './firebase';
import { requirePermission, requireReady } from './tenantDataCore';
import { listPatientRecords } from './tenantData';

export async function listOdontogramEvents(session: TenantAccessState, patientId: string): Promise<OdontogramEvent[]> {
  const ready = requireReady(session);
  requirePermission(ready, 'clinical.read');
  return listPatientRecords<OdontogramEvent>(ready, patientId, 'odontogramEvents');
}

export async function addOdontogramEvent(session: TenantAccessState, patientId: string,
  input: { toothId: string; surface: string; finding: string; note: string; supersedesEventId?: string }) {
  const ready = requireReady(session);
  requirePermission(ready, 'clinical.write');
  if (!canUse(ready.tenant, 'clinical_records')) throw new Error('Registro clínico indisponível.');
  const values = validateOdontogramInput(input);
  const actorId = ready.membership?.userId ?? (ready.isPlatformOwner ? auth.currentUser?.uid : undefined);
  if (!actorId) throw new Error('Sessão clínica autenticada obrigatória.');
  const base = ['tenants', ready.tenant.id, 'patients', patientId];
  const patientRef = doc(db, 'tenants', ready.tenant.id, 'patients', patientId);
  const eventRef = doc(collection(db, ...base, 'odontogramEvents'));
  const auditRef = doc(collection(db, 'tenants', ready.tenant.id, 'auditLogs'));
  await runTransaction(db, async tx => {
    const patient = await tx.get(patientRef);
    if (!patient.exists() || patient.data().tenantId !== ready.tenant.id || patient.data().status !== 'active') {
      throw new Error('Paciente não está ativo nesta clínica.');
    }
    if (input.supersedesEventId) {
      const earlier = await tx.get(doc(db, ...base, 'odontogramEvents', input.supersedesEventId));
      if (!earlier.exists() || earlier.data().tenantId !== ready.tenant.id
        || earlier.data().patientId !== patientId || earlier.data().toothId !== values.toothId) {
        throw new Error('Evento anterior inválido para correção.');
      }
    }
    tx.set(eventRef, {
      ...values, id: eventRef.id, tenantId: ready.tenant.id, patientId, createdBy: actorId,
      createdAt: serverTimestamp(), auditLogId: auditRef.id,
      ...(input.supersedesEventId ? { supersedesEventId: input.supersedesEventId } : {}),
    });
    tx.set(auditRef, {
      tenantId: ready.tenant.id, actorId, actorRole: ready.membership?.role ?? 'platform_owner',
      action: 'odontogram_event.create', resourceType: 'odontogramEvent',
      resourceId: eventRef.id, patientId, timestamp: serverTimestamp(),
    });
  });
  return eventRef.id;
}
