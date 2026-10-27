import { useEffect, useState } from 'react';
import { issueIntakeLink, listIntakeSubmissions, reviewIntake, type IntakeSubmission } from '../../lib/intakeClient';
import { useReadyTenantAccess } from './TenantContext';

export function IntakeReviewPage() {
  const session = useReadyTenantAccess();
  const [rows,setRows] = useState<IntakeSubmission[]>([]);
  const [link,setLink] = useState<{url:string;expiresAt:string}|null>(null);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');
  const canManage = !session.isDemo && session.permissions.includes('intake.manage');

  async function refresh() {
    setLoading(true);
    try { setRows(await listIntakeSubmissions(session)); setError(''); }
    catch (e) {setError(e instanceof Error ? e.message : 'Falha ao consultar a fila.');}
    finally {setLoading(false);}
  }
  useEffect(()=>{void refresh();},[session]);

  async function createLink() {
    setBusy(true);setError('');setMessage('');
    try {setLink(await issueIntakeLink(session));setMessage('Link de uso único emitido. Envie apenas ao paciente destinatário.');}
    catch (e) {setError(e instanceof Error?e.message:'Falha ao emitir link.');}
    finally {setBusy(false);}
  }

  async function review(id:string, decision:'approved'|'rejected') {
    setBusy(true);setError('');setMessage('');
    try {
      await reviewIntake(session,id,decision);
      await refresh();
      setMessage(decision==='approved' ? 'Pré-cadastro aprovado para conferência da recepção. Crie o paciente no cadastro oficial somente após a validação.' : 'Pré-cadastro rejeitado.');
    } catch (e) {setError(e instanceof Error?e.message:'Falha ao revisar.');}
    finally {setBusy(false);}
  }
  return <>
    <div className="page-head"><div><span className="eyebrow">Recepção · Pro/Premium</span>
      <h1>Pré-cadastros por link</h1>
      <p className="muted">O paciente fornece somente dados de contato. Cada link expira em 7 dias ou no primeiro envio. Nenhuma ficha clínica é criada automaticamente.</p>
    </div></div>
    {session.isDemo && <p className="demo-banner">Ambiente demonstrativo · sem geração de links ou dados reais.</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    {message && <p role="status" className="form-success">{message}</p>}
    {canManage && <section className="card" aria-label="Gerar convite">
      <h2>Novo convite</h2>
      <p>Gere o link somente quando a clínica tiver autorização para contatar o paciente. Não publique este link em redes sociais.</p>
      <button type="button" className="btn primary" onClick={()=>void createLink()} disabled={busy}>{busy?'Gerando…':'Gerar link seguro'}</button>
      {link && <div className="data-form">
        <label>Copie e envie individualmente ao paciente<input readOnly value={link.url} onFocus={e=>e.currentTarget.select()} /></label>
        <p className="muted">Expira em {new Date(link.expiresAt).toLocaleString('pt-BR')}; um envio apenas. A URL não será arquivada na interface.</p>
        <button className="btn secondary" type="button" onClick={()=>{void navigator.clipboard.writeText(link.url);}}>Copiar link</button>
      </div>}
    </section>}
    <section className="card table-card" style={{marginTop:16}}>
      <div className="card-title"><h2>Fila de revisão</h2><button className="btn secondary" type="button" onClick={()=>void refresh()} disabled={loading}>Atualizar</button></div>
      {loading ? <p role="status">Carregando pré-cadastros…</p> : !rows.length ? <p>Nenhuma solicitação nesta clínica.</p> :
      <table className="table"><caption className="sr-only">Pré-cadastros recebidos</caption>
        <thead><tr><th>Paciente informado</th><th>Contato</th><th>Estado</th><th>Revisão</th></tr></thead>
        <tbody>{rows.map(row=><tr key={row.id}>
          <td><b>{row.name}</b></td>
          <td>{row.phone}{row.email ? <> · {row.email}</> : null}</td>
          <td>{row.status==='pending_review'?'Pendente':row.status==='approved'?'Aprovado':'Rejeitado'}</td>
          <td>{row.status==='pending_review' && canManage ? <div className="row-actions">
            <button type="button" className="btn secondary" disabled={busy} onClick={()=>void review(row.id,'approved')}>Aprovar</button>
            <button type="button" className="btn secondary" disabled={busy} onClick={()=>void review(row.id,'rejected')}>Rejeitar</button>
          </div> : '—'}</td>
        </tr>)}</tbody></table>}
    </section>
  </>;
}
