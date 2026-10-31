import { useEffect,useState } from 'react';
import { listTenantRecords } from '../../lib/tenantData';
import { changeOpenBookingRequestsEnabled, issueBookingLink, listOpenBookingQueue, openBookingRequestsEnabled, reviewOpenBookingRequest, revokeBookingLink, type OpenBookingQueueItem } from '../../lib/publicBookingClient';
import type { Patient,Professional,Procedure,ScheduleResource } from '../../domain/types';
import { useReadyTenantAccess } from './TenantContext';

export function BookingInvitesPage() {
  const session=useReadyTenantAccess();
  const [patients,setPatients]=useState<Patient[]>([]);
  const [professionals,setProfessionals]=useState<Professional[]>([]);
  const [procedures,setProcedures]=useState<Procedure[]>([]);
  const [resources,setResources]=useState<ScheduleResource[]>([]);
  const [patientId,setPatientId]=useState('');
  const [professionalId,setProfessionalId]=useState('');
  const [procedureId,setProcedureId]=useState('');
  const [resourceId,setResourceId]=useState('');
  const [durationMinutes,setDurationMinutes]=useState<30|60>(30);
  const [link,setLink]=useState<{url:string;expiresAt:string}|null>(null);
  const [busy,setBusy]=useState(false);
  const [confirmRevoke,setConfirmRevoke]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [loaded,setLoaded]=useState(false);
  const [openRequests,setOpenRequests]=useState<OpenBookingQueueItem[]>([]);
  const [acceptOpen,setAcceptOpen]=useState(false);
  const [requestsBusy,setRequestsBusy]=useState(false);
  const mayToggle=!session.isDemo&&session.membership?.role==='tenant_owner'&&session.permissions.includes('tenant.manage');
  useEffect(()=>{
    let active=true;
    async function load() {
      try {
        const [p,pros,proceds,res]=await Promise.all([
          listTenantRecords<Patient>(session,'patients'),
          listTenantRecords<Professional>(session,'professionals'),
          listTenantRecords<Procedure>(session,'procedures'),
          listTenantRecords<ScheduleResource>(session,'scheduleResources'),
        ]);
        if(active){setPatients(p.filter(x=>x.status==='active'));setProfessionals(pros.filter(x=>x.status==='active'));
          setProcedures(proceds.filter(x=>x.active));setResources(res.filter(x=>x.active));}
      }catch(e){if(active)setError(e instanceof Error?e.message:'Falha nos cadastros.');}
      finally{if(active)setLoaded(true);}
    }
    if(!session.isDemo)void load();else setLoaded(true);
    return ()=>{active=false;};
  },[session]);

  async function loadOpenRequests(){
    if(session.isDemo)return;
    setRequestsBusy(true);
    try{
      const [rows,enabled]=await Promise.all([
        listOpenBookingQueue(session),openBookingRequestsEnabled(session),
      ]);
      setOpenRequests(rows);setAcceptOpen(enabled);
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar solicitações.');}
    finally{setRequestsBusy(false);}
  }
  useEffect(()=>{if(!session.isDemo)void loadOpenRequests();},[session]);
  async function toggleOpenRequests(){
    setRequestsBusy(true);setError('');setMessage('');
    try{
      await changeOpenBookingRequestsEnabled(session,!acceptOpen);
      setAcceptOpen(!acceptOpen);setMessage(!acceptOpen
        ?'Solicitações públicas habilitadas na clínica. O Worker ainda exige Turnstile e limitador operacional.'
        :'Solicitações públicas desativadas. Pedidos anteriores ficam preservados.');
    }catch(e){setError(e instanceof Error?e.message:'Falha ao atualizar o mini-site.');}
    finally{setRequestsBusy(false);}
  }
  async function markRequest(id:string,status:'contacted'|'dismissed'){
    setRequestsBusy(true);setError('');setMessage('');
    try{
      await reviewOpenBookingRequest(session,id,status);
      await loadOpenRequests();
      setMessage(status==='contacted'
        ?'Contato registrado. Crie a consulta na agenda somente depois de confirmar com o paciente.'
        :'Solicitação dispensada e preservada no histórico.');
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível revisar o pedido.');}
    finally{setRequestsBusy(false);}
  }
  async function generate(){
    setBusy(true);setError('');setMessage('');setConfirmRevoke(false);setLink(null);
    try{
      const invite=await issueBookingLink(session,{patientId,professionalId,procedureId,
        ...(resourceId?{resourceId}:{}),durationMinutes});
      setLink(invite);
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível gerar o convite.');}
    finally{setBusy(false);}
  }
  async function revoke(){
    if(!link)return;
    setBusy(true);setError('');setMessage('');
    try{await revokeBookingLink(session,link.url);setLink(null);setConfirmRevoke(false);
      setMessage('Convite revogado com auditoria. Nenhuma consulta existente foi cancelada.');}
    catch(e){setError(e instanceof Error?e.message:'Não foi possível revogar o convite.');}
    finally{setBusy(false);}
  }
  return <section>
    <div className="page-head"><div><span className="eyebrow">Agenda profissional</span><h1>Convite para agendamento</h1>
      <p className="muted">Gere um link individual para um paciente cadastrado. O link vale sete dias, permite uma reserva e não expõe o cadastro clínico.</p>
    </div></div>
    {session.isDemo && <p className="demo-banner">Ambiente de demonstração · nenhuma reserva real.</p>}
    {error&&<p role="alert" className="form-error">{error}</p>}
    {message&&<p role="status" className="form-success">{message}</p>}
    <div className="card data-form">
      {!loaded?<p>Carregando cadastros…</p>:<>
      <label>Paciente cadastrado<select required value={patientId} onChange={e=>setPatientId(e.target.value)}>
        <option value="">Selecione</option>{patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select></label>
      <label>Profissional<select required value={professionalId} onChange={e=>setProfessionalId(e.target.value)}>
        <option value="">Selecione</option>{professionals.map(p=><option key={p.id} value={p.id}>{p.displayName}</option>)}
      </select></label>
      <label>Procedimento<select required value={procedureId} onChange={e=>setProcedureId(e.target.value)}>
        <option value="">Selecione</option>{procedures.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select></label>
      <label>Cadeira/sala<select value={resourceId} onChange={e=>setResourceId(e.target.value)}>
        <option value="">Sem recurso físico específico</option>{resources.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
      </select></label>
      <label>Duração<select value={durationMinutes} onChange={e=>setDurationMinutes(Number(e.target.value) as 30|60)}>
        <option value={30}>30 minutos</option><option value={60}>60 minutos</option>
      </select></label>
      <button type="button" className="btn primary" disabled={busy||session.isDemo||!patientId||!professionalId||!procedureId} onClick={()=>void generate()}>
        {busy?'Gerando…':'Criar convite pessoal'}</button>
      </>}
      {link&&<section aria-label="Link reservado" className="card">
        <p>Compartilhe apenas com o paciente escolhido; não publique este convite.</p>
        <label>Link pessoal<input readOnly value={link.url} onFocus={e=>e.currentTarget.select()} /></label>
        <p className="muted">Expira em {new Date(link.expiresAt).toLocaleString('pt-BR')}, ou após o primeiro agendamento.</p>
        <button type="button" className="btn secondary" onClick={()=>{void navigator.clipboard.writeText(link.url);}}>Copiar convite</button>
        {!confirmRevoke?<button type="button" className="btn secondary" disabled={busy}
          onClick={()=>setConfirmRevoke(true)}>Revogar convite não utilizado</button>
          : <div role="group" aria-label="Confirmação de revogação">
            <p>Este link deixará de funcionar. Consultas já confirmadas não serão canceladas.</p>
            <button type="button" className="btn secondary" disabled={busy} onClick={()=>void revoke()}>
              {busy?'Revogando…':'Confirmar revogação'}
            </button>
            <button type="button" className="btn secondary" disabled={busy}
              onClick={()=>setConfirmRevoke(false)}>Voltar</button>
          </div>}
      </section>}
    </div>
    <section className="card data-form" aria-label="Solicitações públicas de agendamento" style={{marginTop:16}}>
      <h2>Pedidos públicos para análise</h2>
      <p className="muted">Solicitações não reservam horários nem criam pacientes. Use os dados apenas para retornar o contato;
        confirme a disponibilidade antes de criar uma consulta na agenda interna.</p>
      {mayToggle&&<div className="row-actions">
        <span>Recebimento público: <strong>{acceptOpen?'Habilitado':'Desabilitado'}</strong></span>
        <button type="button" className="btn secondary" disabled={requestsBusy}
          onClick={()=>void toggleOpenRequests()}>
          {acceptOpen?'Desativar solicitações públicas':'Habilitar solicitações públicas'}
        </button>
      </div>}
      <div className="row-actions"><button type="button" className="btn secondary" disabled={requestsBusy||session.isDemo}
        onClick={()=>void loadOpenRequests()}>{requestsBusy?'Atualizando…':'Atualizar pedidos'}</button></div>
      {openRequests.length===0?<p className="muted">Nenhuma solicitação pública nesta clínica.</p>:
        <div className="table-card"><table className="table">
          <caption className="sr-only">Solicitações recebidas, sem horários reservados</caption>
          <thead><tr><th>Contato</th><th>Preferência</th><th>Situação</th><th>Ação</th></tr></thead>
          <tbody>{openRequests.map(item=><tr key={item.id}>
            <td><strong>{item.name}</strong><p>{item.phone}{item.email?' · '+item.email:''}</p></td>
            <td>{new Date(item.preferredAt).toLocaleString('pt-BR')}</td>
            <td>{item.status==='pending_review'?'Aguardando análise':item.status==='contacted'?'Contatado':'Dispensado'}</td>
            <td>{item.status==='pending_review'?<div className="row-actions">
              <button type="button" className="btn secondary" disabled={requestsBusy}
                onClick={()=>void markRequest(item.id,'contacted')}>Contato realizado</button>
              <button type="button" className="btn secondary" disabled={requestsBusy}
                onClick={()=>void markRequest(item.id,'dismissed')}>Dispensar</button>
            </div>:'—'}</td>
          </tr>)}</tbody>
        </table></div>}
    </section>
  </section>;
}
