import { collection, doc, getDocs, runTransaction, serverTimestamp } from 'firebase/firestore';
import type { Membership, MembershipRole } from '../domain/types';
import { permissionsForRole } from '../domain/permissions';
import { db } from './firebase';
import type { TenantAccessState } from '../modules/tenant/TenantContext';
import { requirePermission } from './tenantData';

export async function listTenantMemberships(session: TenantAccessState): Promise<Membership[]> {
  if (session.status !== 'ready') throw new Error('Tenant indisponível');
  const snapshot = await getDocs(collection(db, 'tenants', session.tenant.id, 'memberships'));
  return snapshot.docs.map(item => ({ ...item.data(), userId: item.id } as Membership));
}

export async function saveTenantMembership(
  session: TenantAccessState,
  userId: string,
  role: MembershipRole,
  status: 'active' | 'inactive',
) {
  if (session.status !== 'ready' || session.isDemo) throw new Error('Memberships só podem ser alteradas em tenants conectados.');
  requirePermission(session, 'memberships.manage');
  const actorId = session.membership?.userId;
  if (!actorId) throw new Error('Membership ativa necessária.');
  const normalizedUid = userId.trim();
  if (!/^[A-Za-z0-9:_-]{1,128}$/.test(normalizedUid)) throw new Error('Informe um UID válido do Firebase Auth.');
  if (normalizedUid === actorId) throw new Error('Não é possível alterar a própria membership.');

  const tenantId = session.tenant.id;
  const membershipRef = doc(db, 'tenants', tenantId, 'memberships', normalizedUid);
  const auditRef = doc(collection(db, 'tenants', tenantId, 'auditLogs'));
  await runTransaction(db, async transaction => {
    const current = await transaction.get(membershipRef);
    const exists = current.exists();
    const values = {
      tenantId,
      userId: normalizedUid,
      role,
      status,
      permissions: permissionsForRole(role),
      lastAuditLogId: auditRef.id,
    };
    if (exists) transaction.update(membershipRef, { ...values, updatedAt: serverTimestamp() });
    else transaction.set(membershipRef, { ...values, createdAt: serverTimestamp(), createdBy: actorId });
    transaction.set(auditRef, {
      tenantId,
      actorId,
      actorRole: session.membership!.role,
      action: exists ? 'membership.update' : 'membership.create',
      resourceType: 'membership',
      resourceId: normalizedUid,
      timestamp: serverTimestamp(),
    });
  });
}
