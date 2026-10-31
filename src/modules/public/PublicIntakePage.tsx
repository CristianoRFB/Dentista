import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { readInviteToken, scrubInviteTokenFromAddressBar } from '../../lib/personalInviteUrl';
import { submitIntake } from '../../lib/intakeClient';
import { demoModeEnabled } from '../auth/AuthRoutes';

export function PublicIntakePage() {
  const { tenantSlug = '' } = useParams();

  const [name,setName] = useState('');
  const [phone,setPhone] = useState('');
  const [email,setEmail] = useState('');
  const [sent,setSent] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const demo = demoModeEnabled() && tenantSlug === 'demo-clinica';
  const [token,setToken] = useState(()=>readInviteToken(window.location));
  useEffect(()=>scrubInviteTokenFromAddressBar(),[]);
  const validTokenFormat = /^[A-Za-z0-9_-]{43}$/.test(token);

  async function send(event:FormEvent) {
    event.preventDefault();
    if(demo){setSent(true);return;}
    if(!validTokenFormat){setError('Solicite um link pessoal à clínica.');return;}
    setBusy(true);setError('');
    try {
      await submitIntake(tenantSlug,token,{name,phone,email});
      setSent(true);
      setToken('');
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível enviar os dados.');}
    finally{setBusy(false);}
  }

  if(!demo && !validTokenFormat && !sent) return <main className="state-page">
    <h1>Pré-cadastro por convite</h1><p>Solicite um link individual à clínica. Cada link só pode ser utilizado uma vez.</p>
    <Link to={'/'+tenantSlug}>Voltar à página da clínica</Link>
  </main>;

  return <main className="intake-page"><section className="intake-card">
    <div className="brand"><span className="brand-mark">O</span><span>{demo ? 'Clínica Aurora · demonstração' : 'Pré-cadastro seguro da clínica'}</span></div>
    {demo&&<p className="demo-banner">Demonstração · os dados não são enviados nem armazenados.</p>}
    {sent ? <>
      <span className="eyebrow">{demo?'Demonstração':'Recebido'}</span>
      <h1>{demo?'Nenhum dado foi enviado.':'Pré-cadastro enviado.'}</h1>
      <p>{demo?'Este é um formulário fictício.':'A clínica irá revisar os dados. O envio não confirma consulta nem cria prontuário automaticamente.'}</p>
      <Link className="btn primary" to={'/'+tenantSlug}>Voltar à clínica</Link>
    </> : <>
      <span className="eyebrow">Etapa única · Convite individual</span><h1>Pré-cadastro</h1>
      <p>Preencha seu nome e telefone para que a clínica possa conferir o contato. O envio não marca uma consulta. Não escreva informações de saúde neste formulário.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <form className="intake-form" onSubmit={e=>void send(e)}>
        <label>Nome completo<input autoComplete="name" required minLength={2} maxLength={160} value={name} onChange={e=>setName(e.target.value)} /></label>
        <label>Telefone<input autoComplete="tel" required minLength={8} maxLength={24} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(00) 00000-0000" /></label>
        <label>E-mail (opcional)<input type="email" autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} /></label>
        <p className="muted">Dados usados exclusivamente pela clínica para conferência do cadastro. Este formulário não confirma agendamento.</p>
        <button className="btn primary large" type="submit" disabled={busy}>{busy?'Enviando…':demo?'Ver demonstração':'Enviar pré-cadastro'}</button>
      </form>
    </>}
  </section></main>;
}
