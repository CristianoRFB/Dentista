import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { demoModeEnabled } from '../auth/AuthRoutes';

export function PublicIntakePage() {
  const { tenantSlug = 'demo-clinica' } = useParams();
  const [sent, setSent] = useState(false);
  const submit = (event: FormEvent) => { event.preventDefault(); setSent(true); };
  if (!demoModeEnabled() || tenantSlug !== 'demo-clinica') return <main className="state-page">
    <h1>Pré-cadastro indisponível</h1><p>O envio público ainda não está habilitado para este tenant.</p>
    <Link to={'/' + tenantSlug}>Voltar à página da clínica</Link>
  </main>;
  return <main className="intake-page"><section className="intake-card">
    <p className="demo-banner">Modo demonstrativo · os dados digitados não são enviados nem armazenados.</p>
    <div className="brand"><span className="brand-mark">O</span><span>Clínica Aurora · demonstração</span></div>
    {sent ? <><span className="eyebrow">Demonstração concluída</span><h1>Nenhum dado foi enviado.</h1><p>O pré-cadastro público exige endpoint seguro e fila de revisão; este formulário não grava informações.</p><Link className="btn primary" to={'/' + tenantSlug}>Voltar à página da clínica</Link></> : <>
      <span className="eyebrow">Fluxo conceitual</span><h1>Pré-cadastro</h1><p>Exemplo de interface, sem captura ou armazenamento de dados.</p>
      <form onSubmit={submit} className="intake-form"><label>Nome completo<input required placeholder="Exemplo fictício" /></label><label>Telefone<input required placeholder="(00) 00000-0000" /></label><label>E-mail<input type="email" placeholder="voce@exemplo.com" /></label><label>Observação<textarea rows={4} placeholder="Não informe dados pessoais neste exemplo." /></label><button className="btn primary large" type="submit">Ver demonstração</button></form>
    </>}
  </section></main>;
}
