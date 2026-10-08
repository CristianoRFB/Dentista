import { collection, getDocs } from 'firebase/firestore';
import type { Membership, MembershipRole } from '../domain/types';
import { db } from './firebase';
import { mutateTenantCapacity } from './capacityClient';
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
  const normalizedUid = userId.trim();
  if (!/^[A-Za-z0-9:_-]{1,128}$/.test(normalizedUid)) throw new Error('Informe um UID válido do Firebase Auth.');
  const existing = await getDocs(collection(db, 'tenants', session.tenant.id, 'memberships'));
  const current = existing.docs.find(item => item.id === normalizedUid)?.data();
  const operation = !current ? 'create'
    : current.status !== status ? status === 'active' ? 'activate' : 'deactivate'
      : current.role !== role ? 'update' : 'update';
  await mutateTenantCapacity(session, 'memberships', operation, { role, status }, normalizedUid);
}
