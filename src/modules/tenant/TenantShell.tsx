import { Link, Outlet, useParams } from 'react-router-dom';
import { useReadyTenantAccess } from './TenantContext';
import { useAuth } from '../auth/AuthProvider';

export function TenantShell() {
  const { tenantSlug = 'demo-clinica' } = useParams();
  const { tenant, permissions, isDemo } = useReadyTenantAccess();
  const { signOutUser } = useAuth();
  const base = '/' + tenantSlug + '/app';
  return <div className="shell app-shell">
    <aside className="sidebar">
      <Link to={base} className="app-brand"><span className="brand-mark small">O</span><div><b>OdontoFlow</b><small>{tenant.branding?.publicName ?? tenant.name}</small></div></Link>
      <nav aria-label="Navegação da clínica">
        <Link to={base}>▦ <span>Dashboard</span></Link>
        {permissions.includes('appointments.read') && <Link to={base + '/agenda'}>⌁ <span>Agenda</span></Link>}
        {permissions.includes('patients.read') && <Link to={base + '/pacientes'}>◫ <span>Pacientes</span></Link>}
        {permissions.includes('recalls.read') && <Link to={base + '/retornos'}>↺ <span>Retornos</span></Link>}
        {permissions.includes('resources.read') && <Link to={base + '/recursos'}>□ <span>Cadeiras e salas</span></Link>}
        {(permissions.includes('professionals.manage') || permissions.includes('procedures.manage')) && <Link to={base + '/cadastros'}>⚙ <span>Cadastros</span></Link>}
      </nav>
      <div className="sidebar-bottom">
        {isDemo && <span className="demo-banner">Modo demonstrativo · dados fictícios</span>}
        <Link to={'/' + tenantSlug + '/cadastro'}>↗ Link de cadastro</Link>
        <Link to="/">⌂ Página inicial</Link>
        <button className="sidebar-signout" type="button" onClick={() => void signOutUser()}>Sair</button>
      </div>
    </aside>
    <main className="content"><Outlet /></main>
  </div>;
}
