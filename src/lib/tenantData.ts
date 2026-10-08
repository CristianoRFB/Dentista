import {
  collection, doc, getDocs, query, runTransaction, serverTimestamp, Timestamp,
  type DocumentData, type QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebase';
import { auth } from './firebase';
import type { TenantAccessState } from '../modules/tenant/tenantResolver';
import {
  createTenantRecordInDb, requirePermission, requireReady, updateTenantRecordInDb,
  type TenantRecordCollection,
} from './tenantDataCore';

export type { TenantRecordCollection } from './tenantDataCore';

function normalizeDocument<T extends DocumentData>(data: T, id: string) {
  const normalized: Record<string, unknown> = { ...data, id };
  for (const field of ['createdAt', 'updatedAt', 'dueAt', 'startsAt', 'endsAt', 'expiresAt', 'lastContactAt', 'revokedAt', 'capturedAt']) {
    const value = normalized[field];
    if (value instanceof Timestamp) normalized[field] = value.toDate().toISOString();
  }
  return normalized as T & { id: string };
}

function clinicalActor(session: TenantAccessState) {
  const actorId = session.membership?.userId ?? (session.isPlatformOwner ? auth.currentUser?.uid : undefined);
  if (!actorId) throw new Error('Membership ativa ou sessão temporária de suporte necessária');
  return { actorId, actorRole: session.membership?.role ?? 'platform_owner' };
}

export { requirePermission } from './tenantDataCore';

export async function listTenantRecords<T extends DocumentData>(
  session: TenantAccessState,
  collectionName: TenantRecordCollection,
  ...constraints: QueryConstraint[]
): Promise<(T & { id: string })[]> {
  const ready = requireReady(session);
  const snapshot = await getDocs(query(collection(db, 'tenants', ready.tenant.id, collectionName), ...constraints));
  return snapshot.docs.map(item => normalizeDocument<T>(item.data() as T, item.id));
}

export async function listPatientRecords<T extends DocumentData>(
  session: TenantAccessState,
  patientId: string,
  subcollection: 'clinicalRecords' | 'clinicalRecordAmendments' | 'clinicalPhotos',
): Promise<(T & { id: string })[]> {
  const ready = requireReady(session);
  const snapshot = await getDocs(collection(db, 'tenants', ready.tenant.id, 'patients', patientId, subcollection));
  return snapshot.docs.map(item => normalizeDocument<T>(item.data() as T, item.id));
}

export async function createTenantRecord(
  session: TenantAccessState,
  collectionName: TenantRecordCollection,
  values: Record<string, unknown>,
  permission: string,
  action: string,
  resourceType: string,
) {
  return createTenantRecordInDb(db, session, collectionName, values, permission, action, resourceType);
}

export async function updateTenantRecord(
  session: TenantAccessState,
  collectionName: TenantRecordCollection,
  id: string,
  values: Record<string, unknown>,
  permission: string,
  action: string,
  resourceType: string,
) {
  return updateTenantRecordInDb(db, session, collectionName, id, values, permission, action, resourceType);
}

export async function addPatientClinicalRecord(
  session: TenantAccessState,
  patientId: string,
  values: { dentistId: string; appointmentId?: string; recordType: 'evolution' | 'procedure' | 'note'; content: string },
) {
  const ready = requireReady(session);
  requirePermission(ready, 'clinical.write');
  const recordRef = doc(collection(db, 'tenants', ready.tenant.id, 'patients', patientId, 'clinicalRecords'));
  const auditRef = doc(collection(db, 'tenants', ready.tenant.id, 'auditLogs'));
  const { actorId, actorRole } = clinicalActor(ready);
  await runTransaction(db, async transaction => {
    transaction.set(recordRef, {
      ...values, tenantId: ready.tenant.id, patientId, createdBy: actorId,
      createdAt: serverTimestamp(), auditLogId: auditRef.id,
    });
    transaction.set(auditRef, {
      tenantId: ready.tenant.id, actorId, actorRole,
      action: 'clinical_record.create', resourceType: 'clinicalRecord', resourceId: recordRef.id, patientId,
      timestamp: serverTimestamp(),
    });
  });
  return recordRef.id;
}

export async function addClinicalAmendment(
  session: TenantAccessState,
  patientId: string,
  recordId: string,
  values: { reason: string; content: string; professionalId?: string },
) {
  const ready = requireReady(session);
  requirePermission(ready, 'clinical.write');
  const recordRef = doc(db, 'tenants', ready.tenant.id, 'patients', patientId, 'clinicalRecords', recordId);
  const amendmentRef = doc(collection(db, 'tenants', ready.tenant.id, 'patients', patientId, 'clinicalRecordAmendments'));
  const auditRef = doc(collection(db, 'tenants', ready.tenant.id, 'auditLogs'));
  const { actorId, actorRole } = clinicalActor(ready);
  await runTransaction(db, async transaction => {
    const source = await transaction.get(recordRef);
    if (!source.exists() || source.data().tenantId !== ready.tenant.id || source.data().patientId !== patientId) {
      throw new Error('Registro clínico não encontrado neste tenant');
    }
    transaction.set(amendmentRef, {
      ...values, recordId, tenantId: ready.tenant.id, patientId, createdBy: actorId,
      createdAt: serverTimestamp(), auditLogId: auditRef.id,
    });
    transaction.set(auditRef, {
      tenantId: ready.tenant.id, actorId, actorRole,
      action: 'clinical_amendment.create', resourceType: 'clinicalAmendment', resourceId: amendmentRef.id, patientId,
      timestamp: serverTimestamp(),
    });
  });
  return amendmentRef.id;
}
