import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Link, useParams } from 'react-router-dom';
import type { Appointment, Patient, Recall, ScheduleResource } from '../../domain/types';
import { demoAppointments, demoPatients, demoRecalls, demoResources } from '../../sample/demoData';
import { listTenantRecords } from '../../lib/tenantData';
import { db } from '../../lib/firebase';
import { useReadyTenantAccess } from './TenantContext';
import { canUse } from '../../commercial/entitlementService';

export function TenantDashboard() {
  const { tenantSlug = 'demo-clinica' } = useParams();
  const base = '/' + tenantSlug + '/app';
  const session = useReadyTenantAccess();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [resources, setResources] = useState<ScheduleResource[]>([]);
  const [error, setError] = useState('');

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
        if (!cancelled) setError('Não foi possível carregar os dados operacionais deste tenant.');
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [session]);

  const patientName = (id: string) => patients.find(patient => patient.id === id)?.name ?? 'Paciente';
  const supportOnly = session.isPlatformOwner && !session.membership;

  return <>
    <div className="page-head"><div><span className="eyebrow">{session.tenant.branding?.publicName ?? session.tenant.name}</span><h1>{supportOnly ? 'Sessão de suporte clínico' : 'Painel da clínica'}</h1><p className="muted">{supportOnly ? 'Acesso temporário com motivo e expiração auditados.' : 'Resumo operacional dos dados deste tenant.'}</p></div>
      {!supportOnly && session.permissions.includes('appointments.manage') && <Link className="btn primary" to={base + '/agenda'}>Abrir agenda</Link>}
    </div>
    {session.isDemo && <p className="demo-banner">Modo demonstrativo · Clínica Aurora e registros fictícios.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="grid cols-4">
      {session.permissions.includes('appointments.read') && <div className="metric-card"><b>{appointments.length}</b><span>consultas hoje</span></div>}
      {session.permissions.includes('patients.read') && <div className="metric-card"><b>{patients.length}</b><span>pacientes ativos</span></div>}
      {session.permissions.includes('recalls.read') && canUse(session.tenant, 'recall_center') && <div className="metric-card"><b>{recalls.length}</b><span>retornos pendentes</span></div>}
      {session.permissions.includes('resources.read') && <div className="metric-card"><b>{resources.length}</b><span>recursos ativos</span></div>}
    </div>
    {session.permissions.includes('appointments.read') && <div className="dashboard-layout">
      <div className="card"><div className="card-title"><h2>Próximos atendimentos</h2><Link to={base + '/agenda'}>ver agenda →</Link></div>
        {appointments.length === 0 ? <p className="muted">Nenhum atendimento marcado para hoje.</p> : appointments.map(appointment => <div className="dash-row" key={appointment.id}>
          <span>{new Date(appointment.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          <b>{patientName(appointment.patientId)}</b><small>{appointment.status}</small>
        </div>)}
      </div>
      <div className="card"><div className="card-title"><h2>Atalhos</h2></div><div className="shortcut-grid">
        {session.permissions.includes('patients.read') && <Link to={base + '/pacientes'}>Pacientes <span>→</span></Link>}
        {session.permissions.includes('recalls.read') && canUse(session.tenant, 'recall_center') && <Link to={base + '/retornos'}>Central de retorno <span>→</span></Link>}
        {session.permissions.includes('resources.read') && <Link to={base + '/recursos'}>Cadeiras e salas <span>→</span></Link>}
        {(session.permissions.includes('professionals.manage') || session.permissions.includes('procedures.manage')) && <Link to={base + '/cadastros'}>Cadastros <span>→</span></Link>}
      </div></div>
    </div>}
  </>;
}
