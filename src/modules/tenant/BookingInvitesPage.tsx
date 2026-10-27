import { useEffect,useState } from 'react';
import { listTenantRecords } from '../../lib/tenantData';
import { issueBookingLink } from '../../lib/publicBookingClient';
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
  const [error,setError]=useState('');
  const [loaded,setLoaded]=useState(false);
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
  async function generate(){
    setBusy(true);setError('');setLink(null);
    try{
      const invite=await issueBookingLink(session,{patientId,professionalId,procedureId,
        ...(resourceId?{resourceId}:{}),durationMinutes});
      setLink(invite);
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível gerar o convite.');}
    finally{setBusy(false);}
  }
  return <section>
    <div className="page-head"><div><span className="eyebrow">Agenda profissional</span><h1>Convite para agendamento</h1>
      <p className="muted">Gere um link individual para um paciente cadastrado. O link vale sete dias, permite uma reserva e não expõe o cadastro clínico.</p>
    </div></div>
    {session.isDemo && <p className="demo-banner">Ambiente de demonstração · nenhuma reserva real.</p>}
    {error&&<p role="alert" className="form-error">{error}</p>}
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
      </section>}
    </div>
  </section>;
}
