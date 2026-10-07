import { Link } from 'react-router-dom';
import { annualEquivalentCents, commercialPlanProposal, formatBRL, PRICING_PROPOSAL_STATUS } from '../../commercial/pricingProposal';

const stateLabel = {
  IMPLEMENTADA: 'implementada',
  EM_IMPLEMENTACAO: 'em implementação',
  PLANEJADA: 'planejada',
  DEFERRED: 'deferred',
} as const;

export function PricingPage(){return <main className="marketing-page">
  <header className="marketing-nav marketing-container"><Link className="brand" to="/"><span className="brand-mark">O</span><span>OdontoFlow</span></Link><Link className="btn secondary" to="/">← Início</Link></header>
  <section className="feature-hero marketing-container pricing-head">
    <span className="eyebrow">{PRICING_PROPOSAL_STATUS.split('_').join(' ')}</span>
    <h1>Planos pensados para crescer com a clínica.</h1>
    <p>Esta página é uma proposta comercial da fundação, não um checkout. Valores, features e limites ainda precisam de validação com clientes reais e entitlement de backend antes de venda em produção.</p>
    <div className="proposal-notice" role="note"><b>Sem fingir implementação:</b> os rótulos abaixo mostram o estado técnico real de cada destaque.</div>
  </section>
  <section className="marketing-container pricing-grid">{commercialPlanProposal.map(p=><article className={`price-card ${p.recommended?'featured':''}`} key={p.id}>
    {p.recommended&&<span className="price-ribbon">proposta recomendada</span>}
    <h2>{p.name}</h2><p>{p.audience}</p>
    <div className="price-placeholder">{formatBRL(p.monthlyPriceCents)} <small>/mês</small></div>
    <p className="annual-note">Anual proposto: {formatBRL(annualEquivalentCents(p))}/mês equivalente (10% off)</p>
    <ul className="clean-list">{p.highlights.map(i=><li key={i.label}><span>{i.label}</span><small className={`feature-state ${i.state.toLowerCase()}`}>{stateLabel[i.state]}</small></li>)}</ul>
    <div className="limits-box"><b>Limites propostos</b><span>{p.limits.professionals} profissional(is)</span><span>{p.limits.resources} recurso(s) físico(s)</span><span>{p.limits.clinicalMediaGb} GB de mídia clínica</span></div>
    <Link className={`btn ${p.recommended?'primary':'secondary'} large`} to="/demo-clinica/app">Explorar demo Premium</Link>
  </article>)}</section>
  <section className="marketing-container usage-section"><h2>Add-ons e custos variáveis ficam separados</h2><p>WhatsApp oficial, IA, armazenamento adicional, domínio personalizado, fiscal e migração complexa não serão escondidos dentro da mensalidade sem medir custo real. Alguns estão DEFERRED e não fazem parte da oferta atual.</p><div className="usage-grid"><div><b>WhatsApp</b><span>DEFERRED • provedor/custo pendente</span></div><div><b>IA</b><span>DEFERRED • privacidade/custo pendente</span></div><div><b>Storage extra</b><span>PLANEJADA • acima da franquia</span></div><div><b>Migração complexa</b><span>PLANEJADA • sob orçamento</span></div></div></section>
  <section className="marketing-container usage-section"><h2>Trial proposto</h2><p>14 dias sem cartão, usando o equivalente ao plano Premium somente para capacidades realmente disponíveis. O tenant fixo de demonstração usa <code>premium_demo</code> + status <code>demo</code>.</p></section>
</main>}
