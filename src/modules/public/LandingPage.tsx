import { Link } from 'react-router-dom';

const features = [
  { title: 'Agenda que enxerga a clínica inteira', text: 'Dentistas, cadeiras, salas, bloqueios, encaixes e retornos na mesma visão operacional.', icon: '⌁' },
  { title: 'Prontuário com contexto, não papel digitalizado', text: 'Evoluções, procedimentos, documentos, exames e histórico clínico com rastreabilidade.', icon: '◫' },
  { title: 'Odontograma vivo', text: 'Estado atual explicado por eventos clínicos, tratamentos planejados e procedimentos realizados.', icon: '◌' },
  { title: 'Fotos clínicas que contam a evolução', text: 'Timeline, classificação por região/dente, fases e comparação contextual de imagens.', icon: '◐' },
  { title: 'Planos de tratamento claros', text: 'Do planejamento ao aceite e à execução, sem misturar informação clínica com cobrança.', icon: '↗' },
  { title: 'Retornos sem depender da memória', text: 'Central de pacientes que precisam voltar, com motivo, data prevista e acompanhamento.', icon: '↺' },
];

const outcomes = [
  ['Agenda', 'menos conflitos, mais previsibilidade'],
  ['Prontuário', 'histórico acessível e rastreável'],
  ['Fotos clínicas', 'evolução visível em contexto'],
  ['Tratamentos', 'planejamento e execução conectados'],
];

export function LandingPage() {
  return <main className="marketing-page">
    <header className="marketing-nav marketing-container">
      <Link className="brand" to="/"><span className="brand-mark">O</span><span>OdontoFlow</span></Link>
      <nav className="marketing-links" aria-label="Navegação principal">
        <a href="#produto">Produto</a><a href="#clinica">Para clínicas</a><Link to="/precos">Planos</Link>
      </nav>
      <div className="marketing-actions"><Link className="btn ghost" to="/platform">Entrar</Link><Link className="btn primary" to="/demo-clinica/app">Ver demonstração</Link></div>
    </header>

    <section className="hero-commercial marketing-container">
      <div className="hero-copy">
        <span className="eyebrow">Software odontológico multi-clínica • White-label</span>
        <h1>Sua clínica organizada.<br/><span>Seu paciente bem acompanhado.</span></h1>
        <p>Agenda, prontuário, odontograma, fotos clínicas, tratamentos e retornos conectados em uma experiência simples de usar.</p>
        <div className="hero-actions"><Link className="btn primary large" to="/demo-clinica/app">Explorar o sistema</Link><a className="btn secondary large" href="#produto">Conhecer recursos</a></div>
        <div className="hero-trust"><span>✓ sem clone por clínica</span><span>✓ dados isolados por tenant</span><span>✓ pronto para personalização</span></div>
      </div>
      <div className="product-window" aria-label="Prévia visual da agenda">
        <div className="window-bar"><div><i></i><i></i><i></i></div><span>Clínica Aurora • Hoje</span><b>09:42</b></div>
        <div className="window-body">
          <aside className="mini-sidebar"><div className="mini-logo">OF</div><span className="active">▦</span><span>◫</span><span>◌</span><span>◐</span><span>↺</span></aside>
          <div className="agenda-preview">
            <div className="preview-head"><div><small>Agenda clínica</small><h3>Quinta-feira, 5 de outubro</h3></div><button>+ Novo horário</button></div>
            <div className="agenda-grid">
              <div className="time-col"><span>09:00</span><span>10:00</span><span>11:00</span><span>12:00</span><span>13:00</span></div>
              <div className="chair-col"><strong>Cadeira 01</strong><div className="appt a"><b>Marina Souza</b><small>Consulta • confirmado</small></div><div className="appt b"><b>Carlos Ribeiro</b><small>Profilaxia • chegou</small></div></div>
              <div className="chair-col"><strong>Cadeira 02</strong><div className="appt c"><b>Lívia Martins</b><small>Restauração • pendente</small></div><div className="open-slot">horário livre</div></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="proof-strip"><div className="marketing-container proof-grid">
      <div><b>Produto primeiro</b><span>O software aparece na landing, não fica escondido atrás de promessas.</span></div>
      <div><b>Benefício primeiro</b><span>Cada módulo é apresentado pelo problema que resolve.</span></div>
      <div><b>Prova real depois</b><span>Sem inventar números: métricas e depoimentos só entram quando forem verdadeiros.</span></div>
    </div></section>

    <section id="produto" className="marketing-section marketing-container">
      <div className="section-heading"><span className="eyebrow">Tecnologia para simplificar</span><h2>O que importa aparece antes do nome do módulo.</h2><p>A página comercial demonstra a rotina da clínica com o próprio produto.</p></div>
      <div className="feature-grid">{features.map(f=><article className="feature-card" key={f.title}><span className="feature-icon">{f.icon}</span><h3>{f.title}</h3><p>{f.text}</p></article>)}</div>
    </section>

    <section className="marketing-section soft-section"><div className="marketing-container split-feature">
      <div className="split-copy"><span className="eyebrow">Agenda odontológica</span><h2>Menos horários vazios. Mais controle da operação.</h2><p>A disponibilidade é calculada por profissional, duração, bloqueios e também por recursos físicos como cadeira ou sala.</p><ul className="clean-list"><li>Conflito de profissional</li><li>Conflito de cadeira/sala</li><li>Encaixes e bloqueios</li><li>Central de retorno</li></ul><Link to="/recursos/agenda" className="text-link">Ver como a agenda funciona →</Link></div>
      <div className="feature-visual schedule-card"><div className="schedule-top"><b>Agenda do dia</b><span>3 cadeiras • 2 dentistas</span></div>{['09:00 • Marina Souza • Consulta','10:30 • Carlos Ribeiro • Profilaxia','12:00 • Horário bloqueado','14:00 • Lívia Martins • Restauração'].map((x,i)=><div className={`schedule-row row-${i}`} key={x}><span>{x.split(' • ')[0]}</span><b>{x.split(' • ')[1]}</b><small>{x.split(' • ')[2]}</small></div>)}</div>
    </div></section>

    <section className="marketing-section marketing-container split-feature reverse">
      <div className="split-copy"><span className="eyebrow">Prontuário clínico</span><h2>O histórico do paciente com começo, meio e contexto.</h2><p>Registro clínico não é um campo de texto gigante. Evoluções e correções relevantes preservam autoria e histórico.</p><div className="outcome-list">{outcomes.map(([a,b])=><div key={a}><b>{a}</b><span>{b}</span></div>)}</div></div>
      <div className="feature-visual patient-card"><div className="patient-top"><div className="avatar">MS</div><div><b>Marina Souza</b><small>Paciente desde 2024</small></div><span className="status-pill">Ativa</span></div><div className="patient-tabs"><span className="active">Linha do tempo</span><span>Odontograma</span><span>Fotos</span></div><div className="timeline"><div><i></i><b>Evolução clínica</b><small>Profilaxia concluída • Dr. Rafael</small></div><div><i></i><b>Foto clínica verificada</b><small>Frontal • fase inicial</small></div><div><i></i><b>Plano apresentado</b><small>3 procedimentos • aguardando aceite</small></div></div></div>
    </section>

    <section className="marketing-section photo-section"><div className="marketing-container"><div className="section-heading light"><span className="eyebrow">Fotos clínicas</span><h2>A evolução que você consegue enxergar.</h2><p>Uma área visual que transforma mídia clínica em contexto de acompanhamento — não em uma pasta de arquivos.</p></div><div className="photo-compare"><div className="photo-panel"><span>10 MAI • INICIAL</span><div className="clinical-placeholder">FRONTAL<br/><small>imagem clínica demonstrativa</small></div></div><div className="compare-control">↔</div><div className="photo-panel"><span>03 OUT • ACOMPANHAMENTO</span><div className="clinical-placeholder later">FRONTAL<br/><small>imagem clínica demonstrativa</small></div></div></div><div className="photo-tags"><span>Região: frontal</span><span>Fase: acompanhamento</span><span>Classificação verificada</span><span>R2 privado</span></div></div></section>

    <section id="clinica" className="marketing-section marketing-container"><div className="section-heading"><span className="eyebrow">Do primeiro contato ao retorno</span><h2>Um fluxo inteiro, sem transformar o MVP em um ERP infinito.</h2></div><div className="journey"><div><b>1</b><span>Paciente preenche cadastro</span></div><i>→</i><div><b>2</b><span>Recepção revisa</span></div><i>→</i><div><b>3</b><span>Consulta acontece</span></div><i>→</i><div><b>4</b><span>Prontuário evolui</span></div><i>→</i><div><b>5</b><span>Retorno é acompanhado</span></div></div></section>

    <section className="marketing-section pricing-teaser"><div className="marketing-container"><div className="section-heading light"><span className="eyebrow">Pricing em validação</span><h2>Planos por capacidade, sem fingir que o gating já existe.</h2><p>Proposta inicial: Essencial R$ 79,90, Pro R$ 129,90 e Premium R$ 189,90. O produto ainda está em fundação; a página de preços mostra o estado real das features.</p></div><div className="plans-preview"><div className="plan-mini"><b>Essencial · R$ 79,90</b><span>1 profissional • core clínico</span></div><div className="plan-mini featured"><small>proposta recomendada</small><b>Pro · R$ 129,90</b><span>até 3 profissionais • operação em equipe</span></div><div className="plan-mini"><b>Premium · R$ 189,90</b><span>até 10 profissionais • gestão ampliada</span></div></div><Link className="btn inverted large" to="/precos">Ver proposta de planos</Link></div></section>

    <section className="marketing-section marketing-container faq"><div className="section-heading"><span className="eyebrow">FAQ</span><h2>O que já está decidido nesta fundação.</h2></div><details><summary>Uma clínica precisa de um projeto separado?</summary><p>Não. A vertical é Multi-Tenant White-Label: novos clientes entram por configuração.</p></details><details><summary>Paciente precisa criar login?</summary><p>Não obrigatoriamente. Patient e User são entidades diferentes.</p></details><details><summary>Fotos clínicas ficam públicas?</summary><p>Não. A fundação usa R2 privado com metadados controlados e cache local.</p></details><details><summary>Planos já têm preço definido?</summary><p>Não. O código separa features, limites e consumo para permitir definição comercial posterior.</p></details></section>

    <section className="final-cta"><div className="marketing-container"><span className="eyebrow">OdontoFlow</span><h2>Uma clínica mais organizada começa por um produto que faz sentido.</h2><p>Explore a demonstração e veja o conceito funcionando.</p><div><Link className="btn primary large" to="/demo-clinica/app">Abrir demonstração</Link><Link className="btn secondary large" to="/platform">Platform Admin</Link></div></div></section>
    <footer className="marketing-footer marketing-container"><div className="brand"><span className="brand-mark">O</span><span>OdontoFlow</span></div><span>Fundação SaaS Dentista • Multi-Tenant White-Label</span></footer>
  </main>;
}
