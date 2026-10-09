import { describe, expect, it, vi } from 'vitest';
import type { Membership, Tenant } from '../src/domain/types';
import { authRouteDecision, platformRouteDecision } from '../src/modules/auth/routeAccess';
import { isValidTenantSlug, resolveTenantAccess, type TenantResolverSource } from '../src/modules/tenant/tenantResolver';

const tenant: Tenant = {
  id: 'tenant-a', name: 'Clínica A', slug: 'clinica-a', status: 'active', features: {}, limits: {},
};
const member: Membership = {
  userId: 'dentist-a', tenantId: 'tenant-a', role: 'dentist', status: 'active', permissions: ['patients.read'],
};

function source(overrides: Partial<TenantResolverSource> = {}): TenantResolverSource {
  return {
    getTenantSlug: vi.fn(async () => ({ tenantId: tenant.id, status: 'active' })),
    getTenant: vi.fn(async () => tenant),
    getMembership: vi.fn(async () => member),
    getPlatformOwner: vi.fn(async () => null),
    getPlatformSupportAccess: vi.fn(async () => null),
    ...overrides,
  };
}

const resolve = (overrides: Partial<Parameters<typeof resolveTenantAccess>[0]> = {}) => resolveTenantAccess({
  tenantSlug: tenant.slug, userUid: 'dentist-a', authLoading: false, demoMode: false, demoTenant: null,
  source: source(), now: 1_800_000_000_000, ...overrides,
});

describe('guards de autenticação e tenant resolver', () => {
  it('mantém rotas privadas em loading e redireciona usuário sem sessão', () => {
    expect(authRouteDecision({ loading: true, hasUser: false, demoMode: false })).toBe('loading');
    expect(authRouteDecision({ loading: false, hasUser: false, demoMode: false })).toBe('login');
    expect(authRouteDecision({ loading: false, hasUser: false, demoMode: true })).toBe('allow');
    expect(authRouteDecision({ loading: false, hasUser: true, demoMode: false })).toBe('allow');
  });

  it('protege /platform até confirmar autenticação e Platform Owner ativo', () => {
    expect(platformRouteDecision({ authLoading: true, checking: false, hasUser: false, isOwner: false })).toBe('loading');
    expect(platformRouteDecision({ authLoading: false, checking: true, hasUser: true, isOwner: false })).toBe('loading');
    expect(platformRouteDecision({ authLoading: false, checking: false, hasUser: false, isOwner: false })).toBe('login');
    expect(platformRouteDecision({ authLoading: false, checking: false, hasUser: true, isOwner: false })).toBe('denied');
    expect(platformRouteDecision({ authLoading: false, checking: false, hasUser: true, isOwner: true })).toBe('allow');
  });

  it('aceita somente slugs no formato canônico e rejeita caminho inválido como não encontrado', async () => {
    expect(isValidTenantSlug('clinica-a-2')).toBe(true);
    for (const invalid of ['', 'Clinica-A', '-clinica', 'clinica-', 'clinica/a', 'clínica']) {
      expect(isValidTenantSlug(invalid)).toBe(false);
    }
    const db = source();
    const result = await resolve({ tenantSlug: 'clinica/a', source: db });
    expect(result.status).toBe('not-found');
    expect(db.getTenantSlug).not.toHaveBeenCalled();
  });

  it('exige registro de slug explicitamente ativo e tenant operacional', async () => {
    expect((await resolve({ source: source({ getTenantSlug: async () => null }) })).status).toBe('not-found');
    expect((await resolve({ source: source({ getTenantSlug: async () => ({ tenantId: tenant.id, status: 'suspended' }) }) })).status).toBe('suspended');
    expect((await resolve({ source: source({ getTenantSlug: async () => ({ tenantId: tenant.id, status: 'archived' }) }) })).status).toBe('suspended');
    expect((await resolve({ source: source({ getTenantSlug: async () => ({ tenantId: tenant.id }) }) })).status).toBe('not-found');
    expect((await resolve({ source: source({ getTenant: async () => ({ ...tenant, status: 'archived' }) }) })).status).toBe('suspended');
    expect((await resolve({ source: source({ getTenant: async () => null }) })).status).toBe('not-found');
    expect((await resolve({ source: source({ getTenant: async () => ({ ...tenant, slug: 'another-clinic' }) }) })).status).toBe('not-found');
  });

  it('exige membership ativa e conserva as permissões carregadas do tenant', async () => {
    const inactive = source({ getMembership: async () => ({ ...member, status: 'inactive' }) });
    expect((await resolve({ source: inactive })).status).toBe('forbidden');
    const noMember = source({ getMembership: async () => null });
    expect((await resolve({ source: noMember })).status).toBe('forbidden');
    const ready = await resolve();
    expect(ready).toMatchObject({ status: 'ready', tenant: { id: 'tenant-a' }, membership: { userId: 'dentist-a' }, permissions: ['patients.read'] });
  });

  it('reconhece Platform Owner somente com status active e exige suporte clínico temporário', async () => {
    const pendingOwner = source({ getMembership: async () => null, getPlatformOwner: async () => ({ status: 'pending' }) });
    expect((await resolve({ source: pendingOwner })).status).toBe('forbidden');
    const activeOwner = source({ getMembership: async () => null, getPlatformOwner: async () => ({ status: 'active' }) });
    expect((await resolve({ source: activeOwner })).status).toBe('forbidden');
    const validSupport = source({
      getMembership: async () => null,
      getPlatformOwner: async () => ({ status: 'active' }),
      getPlatformSupportAccess: async () => ({ actorId: 'dentist-a', expiresAtMs: 1_800_000_000_001 }),
    });
    expect(await resolve({ source: validSupport })).toMatchObject({
      status: 'ready', isPlatformOwner: true, membership: null,
      permissions: ['clinical.read', 'clinical.write', 'patients.read'],
    });
  });

  it('rejeita suporte clínico de outro ator, expirado ou revogado', async () => {
    const invalidSupport = [
      { actorId: 'someone-else', expiresAtMs: 1_800_000_000_001 },
      { actorId: 'dentist-a', expiresAtMs: 1_799_999_999_999 },
      { actorId: 'dentist-a', expiresAtMs: Number.POSITIVE_INFINITY },
      { actorId: 'dentist-a', expiresAtMs: 1_800_000_000_001, revokedAt: 'revoked' },
    ];
    for (const support of invalidSupport) {
      const result = await resolve({ source: source({
        getMembership: async () => null,
        getPlatformOwner: async () => ({ status: 'active' }),
        getPlatformSupportAccess: async () => support,
      }) });
      expect(result.status).toBe('forbidden');
    }
  });

  it('só libera o tenant demo em modo de desenvolvimento explicitamente habilitado', async () => {
    const db = source();
    const demoTenant: Tenant = { ...tenant, id: 'demo', slug: 'demo-clinica', planId: 'premium_demo', subscriptionStatus: 'demo' };
    const demo = await resolve({ tenantSlug: 'demo-clinica', userUid: null, demoMode: true, demoTenant, source: db });
    expect(demo).toMatchObject({ status: 'ready', isDemo: true, membership: null });
    expect(db.getTenantSlug).not.toHaveBeenCalled();
    const denied = await resolve({ tenantSlug: 'demo-clinica', userUid: null, demoMode: false, demoTenant, source: db });
    expect(denied.status).toBe('forbidden');
  });

  it('propaga loading antes de consultar qualquer serviço', async () => {
    const db = source();
    expect((await resolve({ authLoading: true, source: db })).status).toBe('loading');
    expect(db.getTenantSlug).not.toHaveBeenCalled();
  });
});
