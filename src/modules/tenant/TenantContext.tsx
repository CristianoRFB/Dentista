import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Outlet, useParams } from 'react-router-dom';
import type { Membership, Tenant } from '../../domain/types';
import { db } from '../../lib/firebase';
import { demoTenants } from '../../sample/demoData';
import { demoModeEnabled } from '../auth/AuthRoutes';
import { useAuth } from '../auth/AuthProvider';
import { resolveTenantAccess, type TenantAccessState, type TenantResolverSource } from './tenantResolver';

export type { TenantAccessState } from './tenantResolver';

const TenantContext = createContext<TenantAccessState | null>(null);

export function TenantAccessProvider({ children }: { children: React.ReactNode }) {
  const { tenantSlug = '' } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<TenantAccessState>({
    status: 'loading', tenant: null, membership: null, permissions: [], isPlatformOwner: false, isDemo: false, error: null,
  });

  useEffect(() => {
    let cancelled = false;
    async function resolveTenant() {
      setState({ status: 'loading', tenant: null, membership: null, permissions: [], isPlatformOwner: false, isDemo: false, error: null });
      const source: TenantResolverSource = {
        getTenantSlug: async slug => {
          const snapshot = await getDoc(doc(db, 'tenantSlugs', slug));
          return snapshot.exists() ? snapshot.data() : null;
        },
        getTenant: async tenantId => {
          const snapshot = await getDoc(doc(db, 'tenants', tenantId));
          return snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } as Tenant : null;
        },
        getMembership: async (tenantId, uid) => {
          const snapshot = await getDoc(doc(db, 'tenants', tenantId, 'memberships', uid));
          return snapshot.exists() ? { ...snapshot.data(), userId: uid, tenantId } as Membership : null;
        },
        getPlatformOwner: async uid => {
          const snapshot = await getDoc(doc(db, 'platformOwners', uid));
          return snapshot.exists() ? snapshot.data() : null;
        },
        getPlatformSupportAccess: async tenantId => {
          const snapshot = await getDoc(doc(db, 'platformSupportAccess', tenantId));
          if (!snapshot.exists()) return null;
          const support = snapshot.data();
          return {
            actorId: support.actorId,
            revokedAt: support.revokedAt,
            expiresAtMs: support.expiresAt?.toDate?.()?.getTime(),
          };
        },
      };
      const state = await resolveTenantAccess({
        tenantSlug, userUid: user?.uid ?? null, authLoading, demoMode: demoModeEnabled(),
        demoTenant: demoTenants.find(item => item.slug === tenantSlug) ?? null, source,
      });
      if (!cancelled) setState(state);
    }
    void resolveTenant();
    return () => { cancelled = true; };
  }, [tenantSlug, user, authLoading]);

  const value = useMemo<TenantAccessState>(() => state.status === 'ready' && state.tenant.slug !== tenantSlug
    ? { status: 'loading', tenant: null, membership: null, permissions: [], isPlatformOwner: false, isDemo: false, error: null }
    : state, [state, tenantSlug]);
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenantAccess() {
  const value = useContext(TenantContext);
  if (!value) throw new Error('useTenantAccess deve ser usado dentro de TenantAccessProvider');
  return value;
}

export type ReadyTenantAccess = Extract<TenantAccessState, { status: 'ready' }>;

export function useReadyTenantAccess(): ReadyTenantAccess {
  const value = useTenantAccess();
  if (value.status !== 'ready') throw new Error('A tela precisa de uma sessão válida de tenant');
  return value;
}

export function TenantAccessView() {
  const state = useTenantAccess();
  if (state.status === 'loading') return <main className="state-page" role="status">Carregando clínica…</main>;
  if (state.status === 'ready') return null;
  return <main className="state-page" role="alert"><h1>{state.status === 'not-found' ? 'Clínica não encontrada' : 'Acesso indisponível'}</h1><p>{state.error}</p></main>;
}

export function TenantAccessGate() {
  const state = useTenantAccess();
  if (state.status === 'loading') return <main className="state-page" role="status">Carregando clínica…</main>;
  if (state.status !== 'ready') return <TenantAccessView />;
  return <Outlet />;
}

export function TenantPermissionGate({ permission, anyOf }: { permission?: string; anyOf?: string[] }) {
  const state = useTenantAccess();
  if (state.status !== 'ready') return <TenantAccessView />;
  const allowed = permission ? state.permissions.includes(permission) : (anyOf ?? []).some(item => state.permissions.includes(item));
  if (!allowed) return <main className="state-page"><h1>Acesso negado</h1><p>Seu perfil não tem permissão para esta área.</p></main>;
  return <Outlet />;
}
