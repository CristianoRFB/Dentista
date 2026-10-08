import {
  collection, doc, runTransaction, serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import type { TenantAccessState } from '../modules/tenant/tenantResolver';

export type TenantRecordCollection = 'patients' | 'professionals' | 'procedures' | 'scheduleResources' | 'recalls' | 'appointments';

export function requireReady(session: TenantAccessState) {
  if (session.status !== 'ready') throw new Error('Acesso ao tenant indisponível');
  if (session.isDemo) throw new Error('Dados demonstrativos são somente para leitura');
  return session;
}

export function requirePermission(session: TenantAccessState, permission: string) {
  if (session.status !== 'ready' || !session.permissions.includes(permission)) {
    throw new Error('Você não tem permissão para esta ação.');
  }
}

export async function createTenantRecordInDb(
  firestoreDb: Firestore,
  session: TenantAccessState,
  collectionName: TenantRecordCollection,
  values: Record<string, unknown>,
  permission: string,
  action: string,
  resourceType: string,
) {
  const ready = requireReady(session);
  requirePermission(ready, permission);
  const recordRef = doc(collection(firestoreDb, 'tenants', ready.tenant.id, collectionName));
  const auditRef = doc(collection(firestoreDb, 'tenants', ready.tenant.id, 'auditLogs'));
  const actorRole = ready.membership?.role ?? 'platform_owner';
  await runTransaction(firestoreDb, async transaction => {
    transaction.set(recordRef, {
      ...values,
      tenantId: ready.tenant.id,
      lastAuditLogId: auditRef.id,
      createdAt: serverTimestamp(),
      createdBy: ready.membership?.userId,
    });
    transaction.set(auditRef, {
      tenantId: ready.tenant.id,
      actorId: ready.membership?.userId,
      actorRole,
      action,
      resourceType,
      resourceId: recordRef.id,
      timestamp: serverTimestamp(),
    });
  });
  return recordRef.id;
}

export async function updateTenantRecordInDb(
  firestoreDb: Firestore,
  session: TenantAccessState,
  collectionName: TenantRecordCollection,
  id: string,
  values: Record<string, unknown>,
  permission: string,
  action: string,
  resourceType: string,
) {
  const ready = requireReady(session);
  requirePermission(ready, permission);
  const recordRef = doc(firestoreDb, 'tenants', ready.tenant.id, collectionName, id);
  const auditRef = doc(collection(firestoreDb, 'tenants', ready.tenant.id, 'auditLogs'));
  const actorId = ready.membership?.userId;
  if (!actorId) throw new Error('Membership ativa necessária');
  await runTransaction(firestoreDb, async transaction => {
    const current = await transaction.get(recordRef);
    if (!current.exists() || current.data().tenantId !== ready.tenant.id) throw new Error('Registro não encontrado');
    transaction.update(recordRef, { ...values, tenantId: ready.tenant.id, lastAuditLogId: auditRef.id, updatedAt: serverTimestamp() });
    transaction.set(auditRef, {
      tenantId: ready.tenant.id, actorId, actorRole: ready.membership!.role,
      action, resourceType, resourceId: id, timestamp: serverTimestamp(),
    });
  });
}
