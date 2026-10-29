import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom';
import { useReadyTenantAccess } from './TenantContext';
import { useAuth } from '../auth/AuthProvider';
import { canUse } from '../../commercial/entitlementService';

export function TenantShell() {
  const { tenantSlug = 'demo-clinica' } = useParams();
  const { tenant, permissions, isDemo } = useReadyTenantAccess();
  const { signOutUser } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen,setMenuOpen] = useState(false);
  const menuId=useId();
  const closeRef=useRef<HTMLButtonElement>(null);
  const base = '/' + tenantSlug + '/app';
  const nav = [
    {to:base,label:'Dashboard',icon:'▦',allowed:true,end:true},
    {to:base+'/agenda',label:'Agenda',icon:'⌁',allowed:permissions.includes('appointments.read')&&canUse(tenant,'agenda')},
    {to:base+'/pacientes',label:'Pacientes',icon:'◫',allowed:permissions.includes('patients.read')&&canUse(tenant,'patients')},
    {to:base+'/retornos',label:'Retornos',icon:'↺',allowed:permissions.includes('recalls.read')&&canUse(tenant,'recall_center')},
    {to:base+'/pre-cadastros',label:'Pré-cadastros',icon:'◇',allowed:permissions.includes('intake.read')&&canUse(tenant,'intake_link')},
    {to:base+'/convites-agenda',label:'Convites de agenda',icon:'↗',allowed:permissions.includes('appointments.manage')&&canUse(tenant,'agenda')},
    {to:base+'/recursos',label:'Cadeiras e salas',icon:'□',allowed:permissions.includes('resources.read')&&canUse(tenant,'physical_resources')},
    {to:base+'/cadastros',label:'Cadastros',icon:'⚙',allowed:(permissions.includes('professionals.manage')||permissions.includes('procedures.manage'))&&canUse(tenant,'professionals')},
  ];
  useEffect(()=>setMenuOpen(false),[pathname]);
  useEffect(()=>{
    if(!menuOpen)return;
    closeRef.current?.focus();
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setMenuOpen(false);};
    document.addEventListener('keydown',onKey);
    return ()=>document.removeEventListener('keydown',onKey);
  },[menuOpen]);
  return <div className="shell app-shell">
    <header className="app-mobile-header">
      <Link to={base} className="app-brand"><span className="brand-mark small">O</span><span><b>OdontoFlow</b><small>{tenant.branding?.publicName??tenant.name}</small></span></Link>
      <button type="button" className="btn secondary app-menu-trigger" aria-expanded={menuOpen}
        aria-controls={menuId} onClick={()=>setMenuOpen(value=>!value)}>
        {menuOpen?'Fechar':'Menu'} <span aria-hidden="true">{menuOpen?'×':'☰'}</span>
      </button>
    </header>
    {menuOpen&&<button type="button" className="app-menu-scrim" aria-label="Fechar navegação da clínica" onClick={()=>setMenuOpen(false)}/>}
    <aside id={menuId} className={'sidebar'+(menuOpen?' sidebar-open':'')}>
      <div className="sidebar-top">
        <Link to={base} className="app-brand"><span className="brand-mark small">O</span><span><b>OdontoFlow</b><small>{tenant.branding?.publicName??tenant.name}</small></span></Link>
        <button type="button" ref={closeRef} className="app-menu-close" onClick={()=>setMenuOpen(false)} aria-label="Fechar menu">×</button>
      </div>
      <nav aria-label="Navegação da clínica">
        {nav.filter(item=>item.allowed).map(item=><NavLink key={item.to} end={item.end} to={item.to}
          className={({isActive})=>isActive?'sidebar-link-active':undefined} onClick={()=>setMenuOpen(false)}>
          <span className="sidebar-symbol" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
        </NavLink>)}
      </nav>
      <div className="sidebar-bottom">
        {isDemo&&<span className="demo-banner">Modo demonstrativo · dados fictícios</span>}
        {permissions.includes('intake.manage')&&canUse(tenant,'intake_link')&&
          <Link to={base+'/pre-cadastros'}>↗ Links de pré-cadastro</Link>}
        <Link to="/">⌂ Página inicial</Link>
        <button className="sidebar-signout" type="button" onClick={()=>void signOutUser()}>Sair da conta</button>
      </div>
    </aside>
    <main className="content" id="tenant-main-content" tabIndex={-1}><Outlet/></main>
  </div>;
}
