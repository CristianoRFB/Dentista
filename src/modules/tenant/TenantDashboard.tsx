import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Link, useParams } from 'react-router-dom';
import type { Appointment, Patient, Recall, ScheduleResource } from '../../domain/types';
import { demoAppointments, demoPatients, demoRecalls, demoResources } from '../../sample/demoData';
import { listTenantRecords } from '../../lib/tenantData';
import { db } from '../../lib/firebase';
import { useReadyTenantAccess } from './TenantContext';
import { canUse } from '../../commercial/entitlementService';
import { scanTenantMediaUsage, type TenantMediaUsageScan } from '../../lib/mediaUsageClient';

export function TenantDashboard() {
  const { tenantSlug = 'demo-clinica' } = useParams();
  const base = '/' + tenantSlug + '/app';
  const session = useReadyTenantAccess();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [resources, setResources] = useState<ScheduleResource[]>([]);
  const [error, setError] = useState('');
  const [mediaUsage,setMediaUsage]=useState<TenantMediaUsageScan|null>(null);
  const [mediaUsageBusy,setMediaUsageBusy]=useState(false);
  const [mediaUsageError,setMediaUsageError]=useState('');
  useEffect(()=>{setMediaUsage(null);setMediaUsageError('');},[session.tenant.id]);
  async function refreshMediaUsage(){
    setMediaUsageBusy(true);setMediaUsageError('');
    try {setMediaUsage(await scanTenantMediaUsage(session,mediaUsage&&!mediaUsage.complete?mediaUsage:undefined));}
    catch(e){setMediaUsageError(e instanceof Error?e.message:'Falha ao medir R2.');}
    finally {setMediaUsageBusy(false);}
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (session.isDemo) {
        setAppointments(demoAppointments); setPatients(demoPatients); setRecalls(demoRecalls); setResources(demoResources);
        return;
      }
      try {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const end = new Date(start.getTime() + 86_400_000);
        const appointmentQuery = query(
          collection(db, 'tenants', session.tenant.id, 'appointments'),
          where('startsAt', '>=', start.toISOString()),
          where('startsAt', '<', end.toISOString()),
        );
        const [allAppointments, allPatients, allRecalls, allResources] = await Promise.all([
          session.permissions.includes('appointments.read') ? getDocs(appointmentQuery).then(snapshot => snapshot.docs.map(item => ({ ...item.data(), id: item.id }) as Appointment)) : Promise.resolve([]),
          session.permissions.includes('patients.read') ? listTenantRecords<Patient>(session, 'patients') : Promise.resolve([]),
          session.permissions.includes('recalls.read') && canUse(session.tenant, 'recall_center') ? listTenantRecords<Recall>(session, 'recalls') : Promise.resolve([]),
          session.permissions.includes('resources.read') ? listTenantRecords<ScheduleResource>(session, 'scheduleResources') : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setAppointments(allAppointments.filter(item => {
          const time = Date.parse(item.startsAt);
          return time >= start.getTime() && time < end.getTime() && item.status !== 'cancelled';
        }).sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
        setPatients(allPatients.filter(item => item.status === 'active'));
        setRecalls(allRecalls.filter(item => !['dismissed', 'scheduled'].includes(item.status)));
        setResources(allResources.filter(item => item.active));
        setError('');
      } catch {
        if (!cancelled) setError('Não foi possível atualizar o resumo desta clínica. Tente acessar a área desejada pelo menu ou atualize a página.');
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [session]);

  const patientName = (id: string) => patients.find(patient => patient.id === id)?.name ?? 'Paciente';
  const supportOnly = session.isPlatformOwner && !session.membership;

  return <>
    <div className="page-head"><div><span className="eyebrow">{session.tenant.branding?.publicName ?? session.tenant.name}</span><h1>{supportOnly ? 'Sessão de suporte clínico' : 'Painel da clínica'}</h1><p className="muted">{supportOnly ? 'Acesso temporário com motivo e expiração auditados.' : 'Veja os atendimentos de hoje e escolha sua próxima tarefa.'}</p></div>
      {!supportOnly && session.permissions.includes('appointments.manage') && <Link className="btn primary" to={base + '/agenda'}>Abrir agenda</Link>}
    </div>
    {session.isDemo && <p className="demo-banner">Modo demonstrativo · Clínica Aurora e registros fictícios.</p>}
    {!supportOnly&&<section className="card workspace-get-started" aria-labelledby="get-started-title">
      <div><h2 id="get-started-title">O que você precisa fazer?</h2>
        <p className="muted">Escolha uma tarefa. As opções exibidas respeitam as permissões do seu perfil.</p></div>
      <div className="workspace-action-grid">
        {session.permissions.includes('appointments.read')&&canUse(session.tenant,'agenda')&&
          <Link to={base+'/agenda'}><strong>Ver agenda</strong><span>Consultar os horários e atendimentos.</span></Link>}
        {session.permissions.includes('patients.read')&&canUse(session.tenant,'patients')&&
          <Link to={base+'/pacientes'}><strong>Encontrar paciente</strong><span>Buscar um cadastro e abrir o prontuário autorizado.</span></Link>}
        {session.permissions.includes('appointments.manage')&&canUse(session.tenant,'agenda')&&
          <Link to={base+'/convites-agenda'}><strong>Enviar convite</strong><span>Gerar links ou analisar pedidos de agendamento.</span></Link>}
        {session.permissions.includes('intake.read')&&canUse(session.tenant,'intake_link')&&
          <Link to={base+'/pre-cadastros'}><strong>Revisar pré-cadastro</strong><span>Conferir informações enviadas por pacientes.</span></Link>}
        <Link to={base+'/ajuda'}><strong>Aprender a usar</strong><span>Entender as áreas disponíveis e como começar.</span></Link>
      </div>
    </section>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="grid cols-4">
      {session.permissions.includes('appointments.read') && <div className="metric-card"><b>{appointments.length}</b><span>consultas hoje</span></div>}
      {session.permissions.includes('patients.read') && <div className="metric-card"><b>{patients.length}</b><span>pacientes ativos</span></div>}
      {session.permissions.includes('recalls.read') && canUse(session.tenant, 'recall_center') && <div className="metric-card"><b>{recalls.length}</b><span>retornos pendentes</span></div>}
      {session.permissions.includes('resources.read') && <div className="metric-card"><b>{resources.length}</b><span>recursos ativos</span></div>}
    </div>
    {!session.isDemo && session.permissions.includes('usage.read') && <section className="card" aria-label="Uso de armazenamento clínico R2" style={{marginTop:18}}>
      <div className="card-title"><h2>Armazenamento de fotos clínicas (R2)</h2></div>
      <p className="muted">Medição sob demanda, somente leitura e exclusiva desta clínica. Não representa limite do plano, cobrança ou backup.</p>
      {mediaUsage && <p role="status"><strong>{(mediaUsage.bytes/1048576).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})} MiB</strong>
        {' em '+mediaUsage.objectCount.toLocaleString('pt-BR')+' objetos'}
        {mediaUsage.complete?' (varredura concluída)':' (parcial; há mais páginas)'}</p>}
      {mediaUsageError && <p className="form-error" role="alert">{mediaUsageError}</p>}
      <button className="btn secondary" type="button" disabled={mediaUsageBusy} onClick={()=>void refreshMediaUsage()}>
        {mediaUsageBusy?'Medindo armazenamento…':mediaUsage&&!mediaUsage.complete?'Continuar medição':'Medir armazenamento agora'}
      </button>
      <p className="muted" style={{marginTop:12,fontSize:12}}>Dados R2 podem mudar durante a varredura. Nenhum arquivo é movido ou excluído.</p>
    </section>}
    {session.permissions.includes('appointments.read') && <div className="dashboard-layout">
      <div className="card"><div className="card-title"><h2>Atendimentos de hoje</h2><Link to={base + '/agenda'}>ver agenda →</Link></div>
        {appointments.length === 0 ? <p className="muted">Nenhum atendimento encontrado para hoje. Confira outros dias na agenda.</p> : appointments.map(appointment => <div className="dash-row" key={appointment.id}>
          <span>{new Date(appointment.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          <b>{patientName(appointment.patientId)}</b><small>{appointment.status}</small>
        </div>)}
      </div>
      <div className="card"><div className="card-title"><h2>Outras áreas</h2></div><div className="shortcut-grid">
        {session.permissions.includes('patients.read') && <Link to={base + '/pacientes'}>Pacientes <span>→</span></Link>}
        {session.permissions.includes('recalls.read') && canUse(session.tenant, 'recall_center') && <Link to={base + '/retornos'}>Central de retorno <span>→</span></Link>}
        {session.permissions.includes('resources.read') && <Link to={base + '/recursos'}>Cadeiras e salas <span>→</span></Link>}
        {(session.permissions.includes('professionals.manage') || session.permissions.includes('procedures.manage')) && <Link to={base + '/cadastros'}>Cadastros <span>→</span></Link>}
      </div></div>
    </div>}
  </>;
}
