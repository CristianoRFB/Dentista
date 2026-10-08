import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import type { TenantBranding } from '../../domain/types';
import { db } from '../../lib/firebase';
import { demoTenants } from '../../sample/demoData';
import { demoModeEnabled } from '../auth/AuthRoutes';

interface PublicTenantProfile extends TenantBranding { tenantId: string; }

export function TenantPublicSite() {
  const { tenantSlug = '' } = useParams();
  const [profile, setProfile] = useState<PublicTenantProfile | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'not-found' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setState('loading'); setProfile(null);
      if (demoModeEnabled() && tenantSlug === 'demo-clinica') {
        const demo = demoTenants.find(item => item.slug === tenantSlug);
        if (!cancelled && demo) {
          setProfile({ tenantId: demo.id, ...(demo.branding ?? {}) });
          setState('ready');
        }
        return;
      }
      try {
        const slug = await getDoc(doc(db, 'tenantSlugs', tenantSlug));
        if (!slug.exists() || slug.data().status !== 'active') { if (!cancelled) setState('not-found'); return; }
        const tenantId = String(slug.data().tenantId ?? '');
        const publicProfile = await getDoc(doc(db, 'tenants', tenantId, 'publicProfile', 'public'));
        if (!publicProfile.exists()) { if (!cancelled) setState('not-found'); return; }
        if (!cancelled) {
          setProfile({ ...publicProfile.data(), tenantId } as PublicTenantProfile);
          setState('ready');
        }
      } catch {
        if (!cancelled) setState('error');
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [tenantSlug]);

  if (state === 'loading') return <main className="state-page" role="status">Carregando página da clínica…</main>;
  if (state !== 'ready' || !profile) return <main className="state-page"><h1>{state === 'not-found' ? 'Clínica não encontrada' : 'Página indisponível'}</h1><p>{state === 'error' ? 'Não foi possível carregar as informações públicas.' : 'O link pode estar incorreto ou ainda não estar publicado.'}</p><Link to="/">Voltar à página inicial</Link></main>;

  const publicName = profile.publicName || 'Clínica';
  const style = { '--brand': profile.primaryColor || '#163d3a', '--accent': profile.accentColor || '#72b9ad' } as React.CSSProperties;
  const hasContact = !!(profile.phone || profile.email || profile.address);
  return <main className="tenant-public" style={style}>
    {demoModeEnabled() && tenantSlug === 'demo-clinica' && <p className="demo-banner public-demo-banner">Modo demonstrativo · conteúdo fictício.</p>}
    <header className="tenant-public-nav marketing-container"><Link className="brand" to={'/' + tenantSlug}><span className="brand-mark">{publicName.slice(0, 1).toUpperCase()}</span><span>{publicName}</span></Link>
      <nav aria-label="Navegação pública"><a href="#sobre">Sobre</a>{hasContact && <a href="#contato">Contato</a>}</nav>
      {profile.email ? <a className="btn primary" href={'mailto:' + profile.email}>Fale com a clínica</a> : profile.phone ? <a className="btn primary" href={'tel:' + profile.phone}>Ligar</a> : <Link className="btn secondary" to="/login">Acesso da equipe</Link>}
    </header>
    <section className="tenant-public-hero marketing-container">
      <div><span className="eyebrow">Odontologia</span><h1>{profile.tagline || 'Cuidado odontológico com acompanhamento próximo.'}</h1><p>{profile.description || 'Conheça a clínica e entre em contato para saber mais sobre os atendimentos.'}</p>
        <div className="hero-actions">{profile.email ? <a className="btn primary large" href={'mailto:' + profile.email}>Enviar mensagem</a> : profile.phone ? <a className="btn primary large" href={'tel:' + profile.phone}>Entrar em contato</a> : <Link className="btn secondary large" to="/login">Acesso da equipe</Link>}</div>
      </div>
      <div className="clinic-visual" aria-hidden="true"><div className="clinic-card"><span>OdontoFlow</span><b>{publicName}</b><small>Informações públicas fornecidas pela clínica.</small></div></div>
    </section>
    <section id="sobre" className="marketing-section marketing-container"><div className="section-heading"><span className="eyebrow">Sobre a clínica</span><h2>{publicName}</h2><p>{profile.description || profile.tagline || 'Informações públicas da clínica.'}</p></div></section>
    {hasContact && <section id="contato" className="marketing-section marketing-container"><div className="tenant-contact"><div><span className="eyebrow">Contato</span><h2>{publicName}</h2><p>{[profile.phone, profile.email, profile.address].filter(Boolean).join(' · ')}</p></div>{profile.email ? <a className="btn primary large" href={'mailto:' + profile.email}>Enviar mensagem</a> : profile.phone ? <a className="btn primary large" href={'tel:' + profile.phone}>Ligar</a> : null}</div></section>}
  </main>;
}
