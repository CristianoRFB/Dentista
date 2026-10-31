import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom';
import { useReadyTenantAccess } from './TenantContext';
import { useAuth } from '../auth/AuthProvider';
import { canUse } from '../../commercial/entitlementService';
import {getWorkspaceNavigation,workspaceContext} from './workspaceNavigation';

export function TenantShell() {
  const { tenantSlug = 'demo-clinica' } = useParams();
  const { tenant, permissions, isDemo } = useReadyTenantAccess();
  const { signOutUser } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen,setMenuOpen] = useState(false);
  const menuId=useId();
  const closeRef=useRef<HTMLButtonElement>(null);
  const triggerRef=useRef<HTMLButtonElement>(null);
  const drawerRef=useRef<HTMLElement>(null);
  const dismissMenu=() => {setMenuOpen(false);triggerRef.current?.focus();};
  const base = '/' + tenantSlug + '/app';
  const groups=getWorkspaceNavigation(base,tenant,permissions);
  const locationLabel=workspaceContext(pathname,groups,base);
  useEffect(()=>setMenuOpen(false),[pathname]);
  useEffect(()=>{
    if(!menuOpen)return;
    // The drawer is modal on mobile: trap keyboard navigation and prevent
    // background scroll; desktop sidebar behavior remains unchanged.
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    // Visibility is transitioned on mobile: focus after it becomes keyboard-focusable.
    const focusTimer=window.setTimeout(()=>closeRef.current?.focus(),230);
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){
        event.preventDefault();
        setMenuOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if(event.key!=='Tab')return;
      const drawer=drawerRef.current;
      if(!drawer)return;
      const focusables=[...drawer.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )].filter(el=>el.getClientRects().length>0);
      if(!focusables.length){event.preventDefault();return;}
      const first=focusables[0],last=focusables[focusables.length-1];
      if(event.shiftKey && (document.activeElement===first || !drawer.contains(document.activeElement))){
        event.preventDefault();last.focus();
      }else if(!event.shiftKey && (document.activeElement===last || !drawer.contains(document.activeElement))){
        event.preventDefault();first.focus();
      }
    };
    document.addEventListener('keydown',onKey);
    return ()=>{clearTimeout(focusTimer);document.removeEventListener('keydown',onKey);document.body.style.overflow=previousOverflow;};
  },[menuOpen]);
  return <div className="shell app-shell">
    <a className="skip-to-clinical-content" href="#tenant-main-content">Pular para o conteúdo clínico</a>
    <header className="app-mobile-header">
      <Link to={base} className="app-brand"><span className="brand-mark small">O</span><span><b>OdontoFlow</b><small>{tenant.branding?.publicName??tenant.name}</small></span></Link>
      <button type="button" ref={triggerRef} className="btn secondary app-menu-trigger" aria-expanded={menuOpen}
        aria-controls={menuId} onClick={()=>setMenuOpen(value=>!value)}>
        {menuOpen?'Fechar':'Menu'} <span aria-hidden="true">{menuOpen?'×':'☰'}</span>
      </button>
    </header>
    {menuOpen&&<button type="button" className="app-menu-scrim" aria-label="Fechar navegação da clínica" onClick={dismissMenu}/>}
    <aside ref={drawerRef} id={menuId} aria-label="Menu da clínica" aria-modal={menuOpen ? true : undefined} role={menuOpen ? "dialog" : undefined} className={'sidebar'+(menuOpen?' sidebar-open':'')}>
      <div className="sidebar-top">
        <Link to={base} className="app-brand"><span className="brand-mark small">O</span><span><b>OdontoFlow</b><small>{tenant.branding?.publicName??tenant.name}</small></span></Link>
        <button type="button" ref={closeRef} className="app-menu-close" onClick={dismissMenu} aria-label="Fechar menu">×</button>
      </div>
      <nav className="workspace-nav" aria-label="Navegação da clínica">
        {groups.map(group=><section className="workspace-nav-group" key={group.id} aria-labelledby={'nav-'+group.id}>
          <h2 id={'nav-'+group.id} className="workspace-nav-heading">{group.label}</h2>
          {group.items.map(item=><NavLink key={item.to} end={item.end} to={item.to}
            aria-label={item.label} title={item.description}
            className={({isActive})=>isActive?'sidebar-link-active':undefined} onClick={()=>setMenuOpen(false)}>
            <span className="sidebar-symbol" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
          </NavLink>)}
        </section>)}
        <section className="workspace-nav-group" aria-labelledby="nav-help">
          <h2 id="nav-help" className="workspace-nav-heading">Orientações</h2>
          <NavLink to={base+'/ajuda'} onClick={()=>setMenuOpen(false)}
            className={({isActive})=>isActive?'sidebar-link-active':undefined}>
            <span className="sidebar-symbol" aria-hidden="true">?</span><span>Como usar o sistema</span>
          </NavLink>
        </section>
      </nav>
      <div className="sidebar-bottom">
        {isDemo&&<span className="demo-banner">Modo demonstrativo · dados fictícios</span>}
        <Link to={base+'/ajuda'}>Precisa de ajuda?</Link>
        {permissions.includes('intake.manage')&&canUse(tenant,'intake_link')&&
          <Link to={base+'/pre-cadastros'}>Pré-cadastros da clínica</Link>}
        <Link to="/">Página pública do OdontoFlow</Link>
        <button className="sidebar-signout" type="button" onClick={()=>void signOutUser()}>Sair da conta</button>
      </div>
    </aside>
    <main className="content" id="tenant-main-content" tabIndex={-1}>
      <div className="workspace-location" aria-label="Localização no sistema">
        <span>Você está em: <strong>{locationLabel.label}</strong></span>
        <Link to={base+'/ajuda'}>Ver orientações</Link>
      </div>
      <Outlet/>
    </main>
  </div>;
}
