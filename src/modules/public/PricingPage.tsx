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
    <p>Planos, preços e limites aprovados. A contratação e a cobrança continuam manuais; esta página não processa pagamentos.</p>
    <div className="proposal-notice" role="note"><b>Disponibilidade transparente:</b> cada item informa se já está implementado, planejado ou adiado.</div>
  </section>
  <section className="marketing-container pricing-grid">{commercialPlanProposal.map(p=><article className={`price-card ${p.recommended?'featured':''}`} key={p.id}>
    {p.recommended&&<span className="price-ribbon">recomendado</span>}
    <h2>{p.name}</h2><p>{p.audience}</p>
    <div className="price-placeholder">{formatBRL(p.monthlyPriceCents)} <small>/mês</small></div>
    <p className="annual-note">{formatBRL(p.annualPriceCents)} por ano · equivalente a {formatBRL(annualEquivalentCents(p))}/mês (10% de desconto)</p>
    <ul className="clean-list">{p.highlights.map(i=><li key={i.label}><span>{i.label}</span><small className={`feature-state ${i.state.toLowerCase()}`}>{stateLabel[i.state]}</small></li>)}</ul>
    <div className="limits-box"><b>Limites aprovados</b><span>{p.limits.professionals} profissional(is) ativo(s)</span><span>{p.limits.adminUsers} usuário(s) ativo(s), sem contar o responsável da clínica</span><span>{p.limits.resources} recurso(s) físico(s)</span><span>1 unidade · pacientes, agendamentos e histórico clínico sem limite artificial</span></div>
    <Link className={`btn ${p.recommended?'primary':'secondary'} large`} to="/demo-clinica/app">Explorar demo Premium</Link>
  </article>)}</section>
  <section className="marketing-container usage-section"><h2>Extras e custos variáveis</h2><p>WhatsApp, IA, armazenamento adicional, domínio personalizado, integração fiscal e migração complexa não têm preço público. O uso de armazenamento ainda não é medido de forma confiável e não tem franquia anunciada.</p><div className="usage-grid"><div><b>WhatsApp e IA</b><span>Adiados · provedor, custo e privacidade pendentes</span></div><div><b>Armazenamento adicional</b><span>Sem quota aplicada até existir medição confiável</span></div><div><b>Migração complexa</b><span>Sob orçamento após análise de amostra</span></div><div><b>Trial</b><span>14 dias, ativado manualmente e sem cartão</span></div></div></section>
</main>}
