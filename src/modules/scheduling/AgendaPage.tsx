import { FormEvent, useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { demoAppointments, demoPatients, demoResources } from '../../sample/demoData';
import type { Appointment, Patient, Procedure, Professional, ScheduleBlock, ScheduleResource } from '../../domain/types';
import { db } from '../../lib/firebase';
import { listTenantRecords } from '../../lib/tenantData';
import { cancelAppointment, saveAppointment } from '../../lib/appointmentClient';
import { useReadyTenantAccess } from '../tenant/TenantContext';

function dayWindow() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return { start, end: new Date(start.getTime() + 86_400_000) };
}

function toLocalInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInput(value: string) {
  return new Date(value).toISOString();
}

function getFormDefaults() {
  const start = new Date();
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
  const end = new Date(start.getTime() + 30 * 60_000);
  return { startsAt: toLocalInput(start), endsAt: toLocalInput(end) };
}

export function AgendaPage() {
  const session = useReadyTenantAccess();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [resources, setResources] = useState<ScheduleResource[]>([]);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [patientId, setPatientId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [procedureId, setProcedureId] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [times, setTimes] = useState(getFormDefaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function refresh() {
    setLoading(true); setError('');
    if (session.isDemo) {
      setAppointments(demoAppointments); setPatients(demoPatients); setResources(demoResources);
      setProfessionals([]); setProcedures([]); setBlocks([]); setLoading(false); return;
    }
    try {
      const { start, end } = dayWindow();
      const appointmentQuery = query(
        collection(db, 'tenants', session.tenant.id, 'appointments'),
        where('startsAt', '>=', start.toISOString()),
        where('startsAt', '<', end.toISOString()),
      );
      const [appointmentSnapshot, patientRows, professionalRows, procedureRows, resourceRows, blockSnapshot] = await Promise.all([
        getDocs(appointmentQuery),
        listTenantRecords<Patient>(session, 'patients'),
        listTenantRecords<Professional>(session, 'professionals'),
        listTenantRecords<Procedure>(session, 'procedures'),
        listTenantRecords<ScheduleResource>(session, 'scheduleResources'),
        getDocs(collection(db, 'tenants', session.tenant.id, 'scheduleBlocks')),
      ]);
      setAppointments(appointmentSnapshot.docs.map(item => ({ ...item.data(), id: item.id }) as Appointment).filter(item => item.status !== 'cancelled').sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
      setPatients(patientRows.filter(item => item.status === 'active'));
      setProfessionals(professionalRows.filter(item => item.status === 'active'));
      setProcedures(procedureRows.filter(item => item.active));
      setResources(resourceRows.filter(item => item.active));
      setBlocks(blockSnapshot.docs.map(item => ({ ...item.data(), id: item.id }) as ScheduleBlock).filter(item => item.active));
    } catch {
      setError('Não foi possível carregar a agenda deste tenant.');
    } finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, [session]);

  function beginReschedule(appointment: Appointment) {
    setEditing(appointment);
    setPatientId(appointment.patientId);
    setProfessionalId(appointment.professionalId);
    setProcedureId(appointment.procedureIds[0] ?? '');
    setResourceId(appointment.resourceId ?? '');
    setTimes({ startsAt: toLocalInput(new Date(appointment.startsAt)), endsAt: toLocalInput(new Date(appointment.endsAt)) });
    setMessage('');
  }

  function resetForm() {
    setEditing(null); setPatientId(''); setProfessionalId(''); setProcedureId(''); setResourceId('');
    setTimes(getFormDefaults());
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    if (!patientId || !professionalId) { setError('Selecione paciente e profissional.'); return; }
    const startsAt = new Date(times.startsAt);
    const endsAt = new Date(times.endsAt);
    if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt) {
      setError('Informe um intervalo de horário válido.'); return;
    }
    setSaving(true);
    try {
      if (session.isDemo) throw new Error('A agenda demonstrativa é somente para leitura.');
      await saveAppointment({
        tenantId: session.tenant.id, patientId, professionalId,
        startsAt: fromLocalInput(times.startsAt), endsAt: fromLocalInput(times.endsAt),
        procedureIds: procedureId ? [procedureId] : [], resourceId: resourceId || undefined,
        status: editing?.status ?? 'confirmed',
        appointmentId: editing?.id,
      });
      setMessage(editing ? 'Agendamento remarcado.' : 'Agendamento criado.');
      resetForm();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o agendamento.');
    } finally { setSaving(false); }
  }

  async function cancel(appointment: Appointment) {
    setError(''); setMessage('');
    try {
      if (session.isDemo) throw new Error('A agenda demonstrativa é somente para leitura.');
      await cancelAppointment(session.tenant.id, appointment.id);
      setMessage('Agendamento cancelado. O horário foi liberado na agenda.');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível cancelar o agendamento.');
    }
  }

  const nameForPatient = (id: string) => patients.find(patient => patient.id === id)?.name ?? 'Paciente';
  const nameForResource = (id?: string) => resources.find(resource => resource.id === id)?.name ?? '—';

  return <>
    <div className="page-head"><div><span className="eyebrow">Operação do dia</span><h1>Agenda</h1><p className="muted">Conflitos são verificados em transação confiável por profissional, recurso e bloqueios.</p></div></div>
    {session.isDemo && <p className="demo-banner">Modo demonstrativo · Clínica Aurora e registros fictícios.</p>}
    {(error || message) && <p className={error ? 'form-error' : 'form-success'} role={error ? 'alert' : 'status'}>{error || message}</p>}
    {session.permissions.includes('appointments.manage') && !session.isDemo && <form className="card data-form appointment-form" onSubmit={submit}>
      <h2>{editing ? 'Remarcar atendimento' : 'Novo agendamento'}</h2>
      <div className="form-grid">
        <label>Paciente<select required value={patientId} onChange={event => setPatientId(event.target.value)}><option value="">Selecione</option>{patients.map(patient => <option key={patient.id} value={patient.id}>{patient.name}</option>)}</select></label>
        <label>Profissional<select required value={professionalId} onChange={event => setProfessionalId(event.target.value)}><option value="">Selecione</option>{professionals.map(person => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select></label>
        <label>Procedimento<select value={procedureId} onChange={event => setProcedureId(event.target.value)}><option value="">Sem procedimento</option>{procedures.map(procedure => <option key={procedure.id} value={procedure.id}>{procedure.name} · {procedure.durationMinutes} min</option>)}</select></label>
        <label>Recurso físico<select value={resourceId} onChange={event => setResourceId(event.target.value)}><option value="">Sem recurso</option>{resources.map(resource => <option key={resource.id} value={resource.id}>{resource.name}</option>)}</select></label>
        <label>Início<input required type="datetime-local" value={times.startsAt} onChange={event => setTimes(current => ({ ...current, startsAt: event.target.value }))} /></label>
        <label>Fim<input required type="datetime-local" value={times.endsAt} onChange={event => setTimes(current => ({ ...current, endsAt: event.target.value }))} /></label>
      </div>
      <div className="form-actions"><button className="btn primary" disabled={saving} type="submit">{saving ? 'Salvando…' : editing ? 'Confirmar remarcação' : 'Criar agendamento'}</button>{editing && <button className="btn secondary" type="button" onClick={resetForm}>Cancelar</button>}</div>
      {blocks.length > 0 && <p className="muted">Há {blocks.length} bloqueios ativos; o serviço confiável verificará os intervalos ao salvar.</p>}
    </form>}
    <div className="card table-card"><table className="table"><caption className="sr-only">Agendamentos do tenant</caption><thead><tr><th>Horário</th><th>Paciente</th><th>Profissional</th><th>Recurso</th><th>Status</th><th></th></tr></thead><tbody>
      {loading ? <tr><td colSpan={6}>Carregando agenda…</td></tr> : appointments.length === 0 ? <tr><td colSpan={6}>Nenhum atendimento para hoje.</td></tr> : appointments.map(appointment => <tr key={appointment.id}>
        <td><b>{new Date(appointment.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}–{new Date(appointment.endsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</b></td>
        <td>{nameForPatient(appointment.patientId)}</td><td>{professionals.find(person => person.id === appointment.professionalId)?.displayName ?? '—'}</td>
        <td>{nameForResource(appointment.resourceId)}</td><td><span className={'status-pill ' + appointment.status}>{appointment.status}</span></td>
        <td className="row-actions">{session.permissions.includes('appointments.manage') && !session.isDemo && !['completed', 'cancelled', 'no_show'].includes(appointment.status) && <><button className="text-button" type="button" onClick={() => beginReschedule(appointment)}>Remarcar</button><button className="text-button danger-link" type="button" onClick={() => void cancel(appointment)}>Cancelar</button></>}</td>
      </tr>)}
    </tbody></table></div>
  </>;
}
