import {
  collection, doc, getDocs, runTransaction, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { SubscriptionStatus, Tenant, TenantBranding } from '../domain/types';
import { permissionsForRole } from '../domain/permissions';
import { validateCommercialAssignment } from '../commercial/entitlementService';

export async function listPlatformTenants(): Promise<Tenant[]> {
  const tenants = await getDocs(collection(db, 'tenants'));
  return tenants.docs.map(snapshot => {
    const data = snapshot.data();
    const trialUntil = data.trialUntil?.toDate?.();
    return { ...data, trialUntil: trialUntil instanceof Date ? trialUntil.toISOString() : data.trialUntil, id: snapshot.id } as Tenant;
  });
}

function tenantAuditRef(tenantId: string, id: string) {
  return doc(db, 'tenants', tenantId, 'auditLogs', id);
}

export async function createPlatformTenant(input: {
  name: string; slug: string; ownerUid: string; publicName: string; primaryColor: string; accentColor: string;
  planId: string; subscriptionStatus: SubscriptionStatus; trialUntil?: string; reason: string;
}, actorId: string) {
  validateCommercialAssignment(input);
  if (input.reason.trim().length < 12 || input.reason.trim().length > 400) throw new Error('Informe um motivo de 12 a 400 caracteres, sem dados clínicos ou segredos.');
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
      planId: input.planId,
      subscriptionStatus: input.subscriptionStatus,
      trialUntil: input.trialUntil ? Timestamp.fromDate(new Date(input.trialUntil)) : null,
      entitlementOverrides: {},
      limitOverrides: {},
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
      reason: input.reason.trim(),
      before: { planId: null, subscriptionStatus: null, trialUntil: null, entitlementOverrides: {}, limitOverrides: {} },
      after: {
        planId: input.planId, subscriptionStatus: input.subscriptionStatus,
        trialUntil: input.trialUntil ? Timestamp.fromDate(new Date(input.trialUntil)) : null,
        entitlementOverrides: {}, limitOverrides: {},
      },
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

export async function updatePlatformTenantCommercialState(tenant: Tenant, input: {
  planId: string; subscriptionStatus: SubscriptionStatus; trialUntil?: string;
  entitlementOverrides: Record<string, boolean>; limitOverrides: Record<string, number | null>; reason: string;
}, actorId: string) {
  validateCommercialAssignment(input);
  if (input.reason.trim().length < 12 || input.reason.trim().length > 400) throw new Error('Informe um motivo de 12 a 400 caracteres, sem dados clínicos ou segredos.');
  const tenantRef = doc(db, 'tenants', tenant.id);
  const auditId = doc(collection(db, 'tenants', tenant.id, 'auditLogs')).id;
  const trialUntil = input.trialUntil ? Timestamp.fromDate(new Date(input.trialUntil)) : null;
  await runTransaction(db, async transaction => {
    const current = await transaction.get(tenantRef);
    if (!current.exists()) throw new Error('Tenant não encontrado.');
    const data = current.data();
    const before = {
      planId: data.planId ?? null,
      subscriptionStatus: data.subscriptionStatus ?? null,
      trialUntil: data.trialUntil ?? null,
      entitlementOverrides: data.entitlementOverrides ?? {},
      limitOverrides: data.limitOverrides ?? {},
    };
    const after = {
      planId: input.planId,
      subscriptionStatus: input.subscriptionStatus,
      trialUntil,
      entitlementOverrides: input.entitlementOverrides,
      limitOverrides: input.limitOverrides,
    };
    transaction.update(tenantRef, { ...after, lastAuditLogId: auditId, updatedAt: serverTimestamp() });
    transaction.set(tenantAuditRef(tenant.id, auditId), {
      tenantId: tenant.id, actorId, actorRole: 'platform_owner', action: 'tenant.commercial.update',
      resourceType: 'tenant', resourceId: tenant.id, timestamp: serverTimestamp(), reason: input.reason.trim(), before, after,
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
