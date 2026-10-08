import type { Membership, Tenant } from '../../domain/types';

export type TenantAccessState =
  | { status: 'loading'; tenant: null; membership: null; permissions: string[]; isPlatformOwner: false; isDemo: false; error: null }
  | { status: 'ready'; tenant: Tenant; membership: Membership | null; permissions: string[]; isPlatformOwner: boolean; isDemo: boolean; error: null }
  | { status: 'not-found' | 'suspended' | 'forbidden' | 'error'; tenant: null; membership: null; permissions: string[]; isPlatformOwner: false; isDemo: false; error: string };

export interface TenantSlugRecord {
  tenantId?: unknown;
  status?: unknown;
}

export interface PlatformSupportRecord {
  actorId?: unknown;
  expiresAtMs?: unknown;
  revokedAt?: unknown;
}

export interface TenantResolverSource {
  getTenantSlug(slug: string): Promise<TenantSlugRecord | null>;
  getTenant(tenantId: string): Promise<Tenant | null>;
  getMembership(tenantId: string, uid: string): Promise<Membership | null>;
  getPlatformOwner(uid: string): Promise<{ status?: unknown } | null>;
  getPlatformSupportAccess(tenantId: string): Promise<PlatformSupportRecord | null>;
}

export interface ResolveTenantAccessInput {
  tenantSlug: string;
  userUid: string | null;
  authLoading: boolean;
  demoMode: boolean;
  demoTenant: Tenant | null;
  source: TenantResolverSource;
  now?: number;
}

export function isValidTenantSlug(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function failure(status: 'not-found' | 'suspended' | 'forbidden' | 'error', error: string): TenantAccessState {
  return { status, tenant: null, membership: null, permissions: [], isPlatformOwner: false, isDemo: false, error };
}

export async function resolveTenantAccess(input: ResolveTenantAccessInput): Promise<TenantAccessState> {
  const { tenantSlug, userUid, authLoading, demoMode, demoTenant, source } = input;
  if (authLoading) {
    return { status: 'loading', tenant: null, membership: null, permissions: [], isPlatformOwner: false, isDemo: false, error: null };
  }
  if (demoMode && tenantSlug === 'demo-clinica' && !userUid && demoTenant) {
    return {
      status: 'ready', tenant: demoTenant, membership: null, permissions: [
        'patients.read','patients.manage','professionals.read','professionals.manage','procedures.read','procedures.manage',
        'appointments.read','appointments.manage','resources.read','resources.manage','recalls.read','recalls.manage','clinical.read','clinical.write',
      ], isPlatformOwner: false, isDemo: true, error: null,
    };
  }
  if (!isValidTenantSlug(tenantSlug)) return failure('not-found', 'Não encontramos esta clínica.');

  try {
    const slugRecord = await source.getTenantSlug(tenantSlug);
    if (!slugRecord) return failure('not-found', 'Não encontramos esta clínica.');
    if (slugRecord.status !== 'active') {
      return slugRecord.status ? failure('suspended', 'Esta clínica está temporariamente indisponível.')
        : failure('not-found', 'Não encontramos esta clínica.');
    }
    if (!userUid) return failure('forbidden', 'Entre com sua conta para acessar esta área.');

    const tenantId = typeof slugRecord.tenantId === 'string' ? slugRecord.tenantId : '';
    if (!tenantId) return failure('not-found', 'A clínica não está disponível.');
    const [membership, ownerRecord] = await Promise.all([
      source.getMembership(tenantId, userUid),
      source.getPlatformOwner(userUid),
    ]);
    const isPlatformOwner = ownerRecord?.status === 'active';
    const hasActiveMembership = membership?.status === 'active';
    if (!hasActiveMembership && !isPlatformOwner) {
      return failure('forbidden', 'Sua conta não tem uma membership ativa nesta clínica.');
    }

    const tenant = await source.getTenant(tenantId);
    if (!tenant) return failure('not-found', 'A clínica não está disponível.');
    if (tenant.slug !== tenantSlug) return failure('not-found', 'Não encontramos esta clínica.');
    if (tenant.status !== 'active') return failure('suspended', 'Esta clínica está temporariamente indisponível.');

    if (hasActiveMembership) {
      return {
        status: 'ready', tenant, membership, permissions: membership.permissions ?? [],
        isPlatformOwner, isDemo: false, error: null,
      };
    }

    const support = await source.getPlatformSupportAccess(tenantId);
    const supportExpiry = support?.expiresAtMs;
    const supportActive = !!support && support.actorId === userUid && !support.revokedAt
      && typeof supportExpiry === 'number' && Number.isFinite(supportExpiry)
      && supportExpiry > (input.now ?? Date.now());
    if (supportActive) {
      return {
        status: 'ready', tenant, membership: null,
        permissions: ['clinical.read','clinical.write','patients.read'],
        isPlatformOwner: true, isDemo: false, error: null,
      };
    }
    return failure('forbidden', 'Sua conta não tem uma membership ativa nesta clínica.');
  } catch {
    return failure('error', 'Não foi possível validar seu acesso à clínica.');
  }
}
