import { Link } from 'react-router-dom';

const features = [
  { title: 'Agenda protegida contra conflitos', text: 'Agendamentos por profissional e recurso, com bloqueios e validação transacional no serviço confiável.', icon: '⌁' },
  { title: 'Prontuário clínico rastreável', text: 'Notas append-only e correções por adendos com autoria, horário e audit log.', icon: '◫' },
  { title: 'Odontograma em fase futura', text: 'O domínio está mapeado; o fluxo clínico do odontograma ainda não está disponível.', icon: '◌' },
  { title: 'Fotos clínicas privadas', text: 'Upload e visualização autenticados, com metadados no Firestore e arquivos em R2 privado.', icon: '◐' },
  { title: 'Plano de tratamento em fase futura', text: 'Planejamento e aceite ainda não fazem parte do núcleo operacional atual.', icon: '↗' },
  { title: 'Central de retorno em fase futura', text: 'A tela atual é somente leitura; criação e acompanhamento persistidos ainda não estão disponíveis.', icon: '↺' },
];

const outcomes = [
  ['Agenda', 'conflitos checados pelo Worker'],
  ['Prontuário', 'registros originais imutáveis'],
  ['Fotos clínicas', 'acesso autenticado em R2 privado'],
  ['Auditoria', 'ações essenciais com autoria'],
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
        <p>O núcleo atual conecta agenda confiável, prontuário auditável, gestão da clínica e mídia clínica privada. Odontograma, planos e retornos persistidos ficam para uma fase futura.</p>
        <div className="hero-actions"><Link className="btn primary large" to="/demo-clinica/app">Explorar o sistema</Link><a className="btn secondary large" href="#produto">Conhecer recursos</a></div>
        <div className="hero-trust"><span>✓ sem clone por clínica</span><span>✓ dados isolados por tenant</span><span>✓ pronto para personalização</span></div>
      </div>
      <div className="product-window" aria-label="Ilustração conceitual da agenda com dados fictícios">
        <div className="concept-label">Ilustração conceitual · não é screenshot do sistema</div>
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
      <div className="split-copy"><span className="eyebrow">Agenda odontológica</span><h2>Menos horários vazios. Mais controle da operação.</h2><p>O Worker valida paciente, profissional, recurso, bloqueios e conflitos em transação Firestore. Locks diários serializam tentativas concorrentes.</p><ul className="clean-list"><li>Conflito de profissional</li><li>Conflito de cadeira/sala</li><li>Bloqueios da clínica</li><li>Cancelamento libera o horário</li></ul><Link to="/recursos/agenda" className="text-link">Ver como a agenda funciona →</Link></div>
      <div className="feature-visual schedule-card"><div className="concept-label">Ilustração conceitual · dados fictícios</div><div className="schedule-top"><b>Agenda do dia</b><span>3 cadeiras • 2 dentistas</span></div>{['09:00 • Marina Souza • Consulta','10:30 • Carlos Ribeiro • Profilaxia','12:00 • Horário bloqueado','14:00 • Lívia Martins • Restauração'].map((x,i)=><div className={`schedule-row row-${i}`} key={x}><span>{x.split(' • ')[0]}</span><b>{x.split(' • ')[1]}</b><small>{x.split(' • ')[2]}</small></div>)}</div>
    </div></section>

    <section className="marketing-section marketing-container split-feature reverse">
      <div className="split-copy"><span className="eyebrow">Prontuário clínico</span><h2>O histórico do paciente com começo, meio e contexto.</h2><p>Registro clínico não é um campo de texto gigante. Evoluções e correções relevantes preservam autoria e histórico.</p><div className="outcome-list">{outcomes.map(([a,b])=><div key={a}><b>{a}</b><span>{b}</span></div>)}</div></div>
      <div className="feature-visual patient-card"><div className="patient-top"><div className="avatar">P</div><div><b>Prontuário P0</b><small>conceito · registros fictícios</small></div><span className="status-pill">Append-only</span></div><div className="patient-tabs"><span className="active">Registro clínico</span><span>Adendos</span><span>Auditoria</span></div><div className="timeline"><div><i></i><b>Registro original</b><small>Não pode ser alterado ou excluído</small></div><div><i></i><b>Correção por adendo</b><small>Motivo, autoria e horário preservados</small></div><div><i></i><b>Acesso por permissão</b><small>clinical.read / clinical.write</small></div></div></div>
    </section>

    <section className="marketing-section photo-section"><div className="marketing-container"><div className="section-heading light"><span className="eyebrow">Fotos clínicas privadas</span><h2>Arquivos clínicos com acesso controlado.</h2><p>O Worker valida token, tenant, membership, permissão e vínculo com o paciente antes de enviar ou entregar uma foto.</p></div><div className="photo-compare"><div className="photo-panel"><span>UPLOAD</span><div className="clinical-placeholder">JPEG · PNG · WEBP<br/><small>validação de conteúdo e tamanho</small></div></div><div className="compare-control">→</div><div className="photo-panel"><span>LEITURA AUTENTICADA</span><div className="clinical-placeholder later">R2 PRIVADO<br/><small>sem URL pública permanente</small></div></div></div><div className="photo-tags"><span>Patient vinculado ao tenant</span><span>Metadata auditável</span><span>Cache private, no-store</span><span>Firebase Storage: deny-all</span></div></div></section>

    <section id="clinica" className="marketing-section marketing-container"><div className="section-heading"><span className="eyebrow">Núcleo operacional atual</span><h2>Um fluxo clínico com autoria e integridade.</h2><p>Cadastro interno, agenda segura e prontuário rastreável. Cadastro público e retorno persistido não estão ativos.</p></div><div className="journey"><div><b>1</b><span>Equipe cadastra paciente</span></div><i>→</i><div><b>2</b><span>Agenda verifica conflitos</span></div><i>→</i><div><b>3</b><span>Atendimento acontece</span></div><i>→</i><div><b>4</b><span>Registro append-only</span></div><i>→</i><div><b>5</b><span>Correções viram adendos</span></div></div></section>

    <section className="marketing-section pricing-teaser"><div className="marketing-container"><div className="section-heading light"><span className="eyebrow">Planos aprovados</span><h2>Capacidade cresce com a operação da clínica.</h2><p>Essencial R$ 79,90, Pro R$ 129,90 e Premium R$ 189,90. Os entitlements e limites aprovados orientam o runtime; a página de preços informa o estado real de cada capacidade. Não há cobrança automática.</p></div><div className="plans-preview"><div className="plan-mini"><b>Essencial · R$ 79,90</b><span>1 profissional • core clínico</span></div><div className="plan-mini featured"><small>operação em equipe</small><b>Pro · R$ 129,90</b><span>até 3 profissionais • operação em equipe</span></div><div className="plan-mini"><b>Premium · R$ 189,90</b><span>até 10 profissionais • gestão ampliada</span></div></div><Link className="btn inverted large" to="/precos">Ver planos e capacidades</Link></div></section>

    <section className="marketing-section marketing-container faq"><div className="section-heading"><span className="eyebrow">FAQ</span><h2>O que já está decidido nesta fundação.</h2></div><details><summary>Uma clínica precisa de um projeto separado?</summary><p>Não. A vertical é Multi-Tenant White-Label: novos clientes entram por configuração.</p></details><details><summary>Paciente precisa criar login?</summary><p>Não obrigatoriamente. Patient e User são entidades diferentes.</p></details><details><summary>Fotos clínicas ficam públicas?</summary><p>Não. R2 é privado e a entrega ocorre pelo Worker com autenticação e permissão clínica.</p></details><details><summary>Quais são os preços aprovados?</summary><p>Essencial R$ 79,90/mês, Pro R$ 129,90/mês e Premium R$ 189,90/mês. Os entitlements controlam o acesso comercial; atribuição e cobrança permanecem manuais.</p></details></section>

    <section className="final-cta"><div className="marketing-container"><span className="eyebrow">OdontoFlow</span><h2>Uma clínica mais organizada começa por um produto que faz sentido.</h2><p>Explore a demonstração e veja o conceito funcionando.</p><div><Link className="btn primary large" to="/demo-clinica/app">Abrir demonstração</Link><Link className="btn secondary large" to="/platform">Platform Admin</Link></div></div></section>
    <footer className="marketing-footer marketing-container"><div className="brand"><span className="brand-mark">O</span><span>OdontoFlow</span></div><span>Fundação SaaS Dentista • Multi-Tenant White-Label</span></footer>
  </main>;
}
