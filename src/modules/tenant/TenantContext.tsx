import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Outlet, useParams } from 'react-router-dom';
import type { Membership, Tenant } from '../../domain/types';
import { db } from '../../lib/firebase';
import { demoTenants } from '../../sample/demoData';
import { demoModeEnabled } from '../auth/AuthRoutes';
import { useAuth } from '../auth/AuthProvider';

export type TenantAccessState =
  | { status: 'loading'; tenant: null; membership: null; permissions: string[]; isPlatformOwner: false; isDemo: false; error: null }
  | { status: 'ready'; tenant: Tenant; membership: Membership | null; permissions: string[]; isPlatformOwner: boolean; isDemo: boolean; error: null }
  | { status: 'not-found' | 'suspended' | 'forbidden' | 'error'; tenant: null; membership: null; permissions: string[]; isPlatformOwner: false; isDemo: false; error: string };

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
      if (authLoading) return;
      if (demoModeEnabled() && tenantSlug === 'demo-clinica' && !user) {
        const tenant = demoTenants.find(item => item.slug === tenantSlug);
        if (!cancelled && tenant) setState({
          status: 'ready', tenant, membership: null, permissions: [
            'patients.read','patients.manage','professionals.read','professionals.manage','procedures.read','procedures.manage',
            'appointments.read','appointments.manage','resources.read','resources.manage','recalls.read','recalls.manage','clinical.read','clinical.write'
          ], isPlatformOwner: false, isDemo: true, error: null,
        });
        return;
      }
      try {
        const slugSnapshot = await getDoc(doc(db, 'tenantSlugs', tenantSlug));
        if (!slugSnapshot.exists()) {
          if (!cancelled) setState({ status: 'not-found', tenant: null, membership: null, permissions: [], isPlatformOwner: false, isDemo: false, error: 'Não encontramos esta clínica.' });
          return;
        }
        if (slugSnapshot.data().status && slugSnapshot.data().status !== 'active') {
          if (!cancelled) setState({ status: 'suspended', tenant: null, membership: null, permissions: [], isPlatformOwner: false, isDemo: false, error: 'Esta clínica está temporariamente indisponível.' });
          return;
        }
        if (!user) {
          if (!cancelled) setState({ status: 'forbidden', tenant: null, membership: null, permissions: [], isPlatformOwner: false, isDemo: false, error: 'Entre com sua conta para acessar esta área.' });
          return;
        }
        const tenantId = String(slugSnapshot.data().tenantId ?? '');
        if (!tenantId) throw new Error('Slug sem tenant associado');
        const [memberSnapshot, ownerSnapshot] = await Promise.all([
          getDoc(doc(db, 'tenants', tenantId, 'memberships', user.uid)),
          getDoc(doc(db, 'platformOwners', user.uid)),
        ]);
        const isPlatformOwner = ownerSnapshot.exists() && ownerSnapshot.data().status !== 'inactive';
        const hasActiveMembership = memberSnapshot.exists() && memberSnapshot.data().status === 'active';
        if (!hasActiveMembership && !isPlatformOwner) {
          if (!cancelled) setState({ status: 'forbidden', tenant: null, membership: null, permissions: [], isPlatformOwner: false, isDemo: false, error: 'Sua conta não tem uma membership ativa nesta clínica.' });
          return;
        }
        const tenantSnapshot = await getDoc(doc(db, 'tenants', tenantId));
        if (!tenantSnapshot.exists()) {
          if (!cancelled) setState({ status: 'not-found', tenant: null, membership: null, permissions: [], isPlatformOwner: false, isDemo: false, error: 'A clínica não está disponível.' });
          return;
        }
        const tenant = { ...tenantSnapshot.data(), id: tenantSnapshot.id } as Tenant;
        if (tenant.status !== 'active') {
          if (!cancelled) setState({ status: 'suspended', tenant: null, membership: null, permissions: [], isPlatformOwner: false, isDemo: false, error: 'Esta clínica está temporariamente indisponível.' });
          return;
        }
        if (hasActiveMembership) {
          const membership = { ...memberSnapshot.data(), userId: user.uid, tenantId } as Membership;
          if (!cancelled) setState({ status: 'ready', tenant, membership, permissions: membership.permissions ?? [], isPlatformOwner, isDemo: false, error: null });
          return;
        }
        const supportSnapshot = isPlatformOwner ? await getDoc(doc(db, 'platformSupportAccess', tenantId)) : null;
        const support = supportSnapshot?.exists() ? supportSnapshot.data() : null;
        const supportExpiry = support?.expiresAt?.toDate?.()?.getTime();
        const supportActive = !!support && support.actorId === user.uid && !support.revokedAt
          && typeof supportExpiry === 'number' && supportExpiry > Date.now();
        if (supportActive) {
          if (!cancelled) setState({ status: 'ready', tenant, membership: null, permissions: ['clinical.read','clinical.write','patients.read'], isPlatformOwner: true, isDemo: false, error: null });
          return;
        }
        if (!cancelled) setState({ status: 'forbidden', tenant: null, membership: null, permissions: [], isPlatformOwner: false, isDemo: false, error: 'Sua conta não tem uma membership ativa nesta clínica.' });
      } catch {
        if (!cancelled) setState({ status: 'error', tenant: null, membership: null, permissions: [], isPlatformOwner: false, isDemo: false, error: 'Não foi possível validar seu acesso à clínica.' });
      }
    }
    void resolveTenant();
    return () => { cancelled = true; };
  }, [tenantSlug, user, authLoading]);

  const value = useMemo(() => state, [state]);
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
