import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { useAuth } from './AuthProvider';

export function demoModeEnabled() {
  return import.meta.env.DEV && import.meta.env.VITE_USE_DEMO_DATA === 'true';
}

export function AuthRequired() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <main className="state-page" role="status">Carregando sessão…</main>;
  if (!user && demoModeEnabled()) return <Outlet />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

export function PlatformOwnerRequired() {
  const { user, loading } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!user) {
        if (!cancelled) { setIsOwner(false); setChecking(false); }
        return;
      }
      try {
        const ownerDoc = await getDoc(doc(db, 'platformOwners', user.uid));
        if (!cancelled) setIsOwner(ownerDoc.exists() && ownerDoc.data().status !== 'inactive');
      } catch {
        if (!cancelled) setIsOwner(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    void check();
    return () => { cancelled = true; };
  }, [user]);

  if (loading || checking) return <main className="state-page" role="status">Verificando acesso da plataforma…</main>;
  if (!user) return <Navigate to="/login" replace state={{ from: { pathname: '/platform' } }} />;
  if (!isOwner) return <main className="state-page"><h1>Acesso negado</h1><p>Esta área é exclusiva do Platform Owner.</p></main>;
  return <Outlet />;
}
