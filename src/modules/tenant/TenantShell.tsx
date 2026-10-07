import { Link, Outlet, useParams } from 'react-router-dom';
export function TenantShell() {
  const { tenantSlug = 'demo-clinica' } = useParams();
  const base = `/${tenantSlug}/app`;
  return <div className="shell app-shell">
    <aside className="sidebar"><Link to={base} className="app-brand"><span className="brand-mark small">O</span><div><b>OdontoFlow</b><small>Clínica Aurora</small></div></Link><nav aria-label="Navegação da clínica">
      <Link to={base}>▦ <span>Dashboard</span></Link><Link to={`${base}/agenda`}>⌁ <span>Agenda</span></Link><Link to={`${base}/pacientes`}>◫ <span>Pacientes</span></Link><Link to={`${base}/retornos`}>↺ <span>Retornos</span></Link><Link to={`${base}/recursos`}>□ <span>Cadeiras e salas</span></Link>
    </nav><div className="sidebar-bottom"><Link to={`/${tenantSlug}/cadastro`}>↗ Link de cadastro</Link><Link to="/">⌂ Landing comercial</Link></div></aside><main className="content"><Outlet /></main>
  </div>;
}
