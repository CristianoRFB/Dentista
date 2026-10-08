import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { useAuth } from './AuthProvider';
import { authRouteDecision, platformRouteDecision } from './routeAccess';

export function demoModeEnabled() {
  return import.meta.env.DEV && import.meta.env.VITE_USE_DEMO_DATA === 'true';
}

export function AuthRequired() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const decision = authRouteDecision({ loading, hasUser: !!user, demoMode: demoModeEnabled() });
  if (decision === 'loading') return <main className="state-page" role="status">Carregando sessão…</main>;
  if (decision === 'login') return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

export function PlatformOwnerRequired() {
  const { user, loading } = useAuth();
  const [ownerCheck, setOwnerCheck] = useState<{ uid: string; active: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setOwnerCheck(null);
      return () => { cancelled = true; };
    }
    const currentUser = user;
    async function check() {
      try {
        const ownerDoc = await getDoc(doc(db, 'platformOwners', currentUser.uid));
        if (!cancelled) setOwnerCheck({ uid: currentUser.uid, active: ownerDoc.exists() && ownerDoc.data().status === 'active' });
      } catch {
        if (!cancelled) setOwnerCheck({ uid: currentUser.uid, active: false });
      }
    }
    void check();
    return () => { cancelled = true; };
  }, [user]);

  const ownerCheckCurrent = !!user && ownerCheck?.uid === user.uid;
  const isOwner = ownerCheckCurrent && ownerCheck.active;
  const decision = platformRouteDecision({ authLoading: loading, checking: !!user && !ownerCheckCurrent, hasUser: !!user, isOwner });
  if (decision === 'loading') return <main className="state-page" role="status">Verificando acesso da plataforma…</main>;
  if (decision === 'login') return <Navigate to="/login" replace state={{ from: { pathname: '/platform' } }} />;
  if (decision === 'denied') return <main className="state-page"><h1>Acesso negado</h1><p>Esta área é exclusiva do Platform Owner.</p></main>;
  return <Outlet />;
}
