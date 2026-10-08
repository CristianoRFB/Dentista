import {
  collection, doc, getDocs, runTransaction, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Tenant, TenantBranding } from '../domain/types';
import { permissionsForRole } from '../domain/permissions';

export async function listPlatformTenants(): Promise<Tenant[]> {
  const tenants = await getDocs(collection(db, 'tenants'));
  return tenants.docs.map(snapshot => ({ ...snapshot.data(), id: snapshot.id }) as Tenant);
}

function tenantAuditRef(tenantId: string, id: string) {
  return doc(db, 'tenants', tenantId, 'auditLogs', id);
}

export async function createPlatformTenant(input: {
  name: string; slug: string; ownerUid: string; publicName: string; primaryColor: string; accentColor: string;
}, actorId: string) {
  const tenantRef = doc(collection(db, 'tenants'));
  const slugRef = doc(db, 'tenantSlugs', input.slug);
  const membershipRef = doc(db, 'tenants', tenantRef.id, 'memberships', input.ownerUid);
  const tenantAuditId = doc(collection(db, 'tenants', tenantRef.id, 'auditLogs')).id;
  const membershipAuditId = doc(collection(db, 'tenants', tenantRef.id, 'auditLogs')).id;
  const profileAuditId = doc(collection(db, 'tenants', tenantRef.id, 'auditLogs')).id;
  await runTransaction(db, async transaction => {
    const slugSnapshot = await transaction.get(slugRef);
    if (slugSnapshot.exists()) throw new Error('Este slug já está em uso.');
    transaction.set(tenantRef, {
      id: tenantRef.id,
      name: input.name.trim(),
      slug: input.slug.trim().toLowerCase(),
      status: 'active',
      features: {},
      limits: {},
      branding: { publicName: input.publicName.trim(), primaryColor: input.primaryColor, accentColor: input.accentColor },
      createdAt: serverTimestamp(),
      createdBy: actorId,
      lastAuditLogId: tenantAuditId,
    });
    transaction.set(slugRef, {
      tenantId: tenantRef.id,
      slug: input.slug.trim().toLowerCase(),
      status: 'active',
      createdAt: serverTimestamp(),
      auditLogId: tenantAuditId,
    });
    transaction.set(membershipRef, {
      userId: input.ownerUid.trim(),
      tenantId: tenantRef.id,
      role: 'tenant_owner',
      status: 'active',
      permissions: permissionsForRole('tenant_owner'),
      createdAt: serverTimestamp(),
      createdBy: actorId,
      lastAuditLogId: membershipAuditId,
    });
    transaction.set(doc(db, 'tenants', tenantRef.id, 'publicProfile', 'public'), {
      tenantId: tenantRef.id,
      publicName: input.publicName.trim(),
      tagline: '',
      description: '',
      phone: '',
      email: '',
      address: '',
      primaryColor: input.primaryColor,
      accentColor: input.accentColor,
      logoUrl: '',
      lastAuditLogId: profileAuditId,
      updatedAt: serverTimestamp(),
    });
    transaction.set(tenantAuditRef(tenantRef.id, tenantAuditId), {
      tenantId: tenantRef.id, actorId, actorRole: 'platform_owner',
      action: 'tenant.create', resourceType: 'tenant', resourceId: tenantRef.id, timestamp: serverTimestamp(),
    });
    transaction.set(tenantAuditRef(tenantRef.id, membershipAuditId), {
      tenantId: tenantRef.id, actorId, actorRole: 'platform_owner',
      action: 'membership.create', resourceType: 'membership', resourceId: input.ownerUid.trim(), timestamp: serverTimestamp(),
    });
    transaction.set(tenantAuditRef(tenantRef.id, profileAuditId), {
      tenantId: tenantRef.id, actorId, actorRole: 'platform_owner',
      action: 'publicProfile.create', resourceType: 'publicProfile', resourceId: 'public', timestamp: serverTimestamp(),
    });
  });
}

export async function setPlatformTenantStatus(tenant: Tenant, status: 'active' | 'suspended', actorId: string) {
  const tenantRef = doc(db, 'tenants', tenant.id);
  const slugRef = doc(db, 'tenantSlugs', tenant.slug);
  const auditId = doc(collection(db, 'tenants', tenant.id, 'auditLogs')).id;
  await runTransaction(db, async transaction => {
    const [current, slug] = await Promise.all([transaction.get(tenantRef), transaction.get(slugRef)]);
    if (!current.exists() || !slug.exists()) throw new Error('Tenant não encontrado.');
    transaction.update(tenantRef, { status, lastAuditLogId: auditId, updatedAt: serverTimestamp() });
    transaction.update(slugRef, { status, auditLogId: auditId, updatedAt: serverTimestamp() });
    transaction.set(tenantAuditRef(tenant.id, auditId), {
      tenantId: tenant.id, actorId, actorRole: 'platform_owner',
      action: status === 'suspended' ? 'tenant.suspend' : 'tenant.activate',
      resourceType: 'tenant', resourceId: tenant.id, timestamp: serverTimestamp(),
    });
  });
}

export async function updatePlatformTenantBranding(tenant: Tenant, branding: TenantBranding, actorId: string) {
  const tenantRef = doc(db, 'tenants', tenant.id);
  const publicProfileRef = doc(db, 'tenants', tenant.id, 'publicProfile', 'public');
  const tenantAuditId = doc(collection(db, 'tenants', tenant.id, 'auditLogs')).id;
  const profileAuditId = doc(collection(db, 'tenants', tenant.id, 'auditLogs')).id;
  await runTransaction(db, async transaction => {
    const current = await transaction.get(tenantRef);
    if (!current.exists()) throw new Error('Tenant não encontrado.');
    transaction.set(tenantRef, { ...current.data(), branding, lastAuditLogId: tenantAuditId, updatedAt: serverTimestamp() });
    transaction.set(publicProfileRef, {
      tenantId: tenant.id,
      publicName: branding.publicName ?? tenant.name,
      tagline: branding.tagline ?? '',
      description: branding.description ?? '',
      phone: branding.phone ?? '',
      email: branding.email ?? '',
      address: branding.address ?? '',
      primaryColor: branding.primaryColor ?? '#163d3a',
      accentColor: branding.accentColor ?? '#72b9ad',
      logoUrl: branding.logoUrl ?? '',
      lastAuditLogId: profileAuditId,
      updatedAt: serverTimestamp(),
    });
    transaction.set(tenantAuditRef(tenant.id, tenantAuditId), {
      tenantId: tenant.id, actorId, actorRole: 'platform_owner',
      action: 'tenant.branding.update', resourceType: 'tenant', resourceId: tenant.id, timestamp: serverTimestamp(),
    });
    transaction.set(tenantAuditRef(tenant.id, profileAuditId), {
      tenantId: tenant.id, actorId, actorRole: 'platform_owner',
      action: 'publicProfile.update', resourceType: 'publicProfile', resourceId: 'public', timestamp: serverTimestamp(),
    });
  });
}

export async function listActiveSupportAccess() {
  const snapshot = await getDocs(collection(db, 'platformSupportAccess'));
  return snapshot.docs.map(docSnapshot => ({ ...docSnapshot.data(), tenantId: docSnapshot.id }));
}

export async function grantClinicalSupport(tenantId: string, reason: string, minutes: number, actorId: string) {
  if (reason.trim().length < 12) throw new Error('Informe um motivo com pelo menos 12 caracteres.');
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 480) throw new Error('A duração deve ficar entre 5 minutos e 8 horas.');
  const supportRef = doc(db, 'platformSupportAccess', tenantId);
  const auditId = doc(collection(db, 'tenants', tenantId, 'auditLogs')).id;
  const expiry = Timestamp.fromDate(new Date(Date.now() + minutes * 60_000));
  await runTransaction(db, async transaction => {
    const current = await transaction.get(supportRef);
    transaction.set(supportRef, {
      tenantId, actorId, reason: reason.trim(), expiresAt: expiry,
      auditLogId: auditId, createdAt: serverTimestamp(), revokedAt: null,
    });
    transaction.set(tenantAuditRef(tenantId, auditId), {
      tenantId, actorId, actorRole: 'platform_owner',
      action: current.exists() ? 'support_access.renew' : 'support_access.grant',
      resourceType: 'supportAccess', resourceId: tenantId, timestamp: serverTimestamp(),
    });
  });
}

export async function revokeClinicalSupport(tenantId: string, actorId: string) {
  const supportRef = doc(db, 'platformSupportAccess', tenantId);
  const auditId = doc(collection(db, 'tenants', tenantId, 'auditLogs')).id;
  await runTransaction(db, async transaction => {
    const current = await transaction.get(supportRef);
    if (!current.exists()) throw new Error('Não há acesso de suporte para revogar.');
    transaction.update(supportRef, { revokedAt: serverTimestamp(), auditLogId: auditId });
    transaction.set(tenantAuditRef(tenantId, auditId), {
      tenantId, actorId, actorRole: 'platform_owner',
      action: 'support_access.revoke', resourceType: 'supportAccess', resourceId: tenantId, timestamp: serverTimestamp(),
    });
  });
}
