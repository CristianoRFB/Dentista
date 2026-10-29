import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { demoPatients, demoRecalls } from '../../sample/demoData';
import type { Appointment, Patient, Recall, RecallStatus } from '../../domain/types';
import { createRecall, updateRecall } from '../../lib/recallData';
import { recallDisplayStatus } from '../../lib/recallValidation';
import { canManageRecalls } from '../../lib/recallValidation';
import { listTenantRecords } from '../../lib/tenantData';
import { useTenantAccess } from '../tenant/TenantContext';

const STATUS: { value: RecallStatus; label: string }[] = [
  { value: 'planned', label: 'Planejado' },
  { value: 'due', label: 'Pendente / vencido' },
  { value: 'contacted', label: 'Contatado manualmente' },
  { value: 'scheduled', label: 'Agendado' },
  { value: 'dismissed', label: 'Encerrado' },
];
const DATE = (value: string) => value.slice(0, 10);
const PAGE_SIZE = 20;
function statusText(value: RecallStatus) { return STATUS.find(item => item.value === value)?.label ?? value; }

export function RecallCenterPage() {
  const session = useTenantAccess();
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [patientId, setPatientId] = useState('');
  const [reason, setReason] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [filter, setFilter] = useState('all');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Recall | null>(null);
  const [editStatus, setEditStatus] = useState<RecallStatus>('planned');
  const [editReason, setEditReason] = useState('');
  const [editDueAt, setEditDueAt] = useState('');
  const [appointmentId, setAppointmentId] = useState('');

  async function refresh() {
    setLoading(true);
    try {
      const [rows, patientRows, appointmentRows] = session.isDemo
        ? [demoRecalls, demoPatients, [] as Appointment[]]
        : await Promise.all([
            listTenantRecords<Recall>(session, 'recalls'),
            listTenantRecords<Patient>(session, 'patients'),
            session.permissions.includes('appointments.read') ? listTenantRecords<Appointment>(session, 'appointments') : Promise.resolve([]),
          ]);
      setRecalls(rows);
      setPatients(patientRows);
      setAppointments(appointmentRows);
      setError('');
    } catch {
      setError('Não foi possível carregar os retornos desta clínica.');
    } finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, [session]);

  const writable = canManageRecalls(session);
  const nameById = useMemo(() => new Map(patients.map(p => [p.id, p.name])), [patients]);
  const displayed = useMemo(() => recalls
    .filter(row => filter === 'all' || recallDisplayStatus(row) === filter)
    .filter(row => (nameById.get(row.patientId) ?? '').toLocaleLowerCase('pt-BR').includes(term.toLocaleLowerCase('pt-BR'))
      || row.reason.toLocaleLowerCase('pt-BR').includes(term.toLocaleLowerCase('pt-BR')))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt)), [recalls, nameById, term, filter]);
  const visible = displayed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(displayed.length / PAGE_SIZE));
  const due = recalls.filter(row => recallDisplayStatus(row) === 'due').length;

  async function create(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      await createRecall(session, { patientId, reason, dueAt });
      setPatientId(''); setReason(''); setDueAt('');
      await refresh(); setMessage('Retorno criado para a clínica atual.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível criar o retorno.'); }
    finally { setSaving(false); }
  }

  function startEdit(recall: Recall) {
    setEditing(recall); setEditReason(recall.reason); setEditDueAt(DATE(recall.dueAt));
    setEditStatus(recallDisplayStatus(recall)); setAppointmentId(recall.appointmentId ?? '');
    setMessage(''); setError('');
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true); setError(''); setMessage('');
    try {
      await updateRecall(session, editing, {
        reason: editReason, dueAt: editDueAt, status: editStatus, appointmentId: appointmentId || undefined,
      });
      setEditing(null); await refresh(); setMessage('Retorno atualizado com registro de auditoria.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar o retorno.'); }
    finally { setSaving(false); }
  }

  return <>
    <div className="page-head"><div><span className="eyebrow">Relacionamento clínico</span><h1>Central de retorno</h1>
      <p className="muted">Acompanhamento interno do paciente. Contatos externos não são enviados automaticamente.</p></div></div>
    {session.isDemo && <p className="demo-banner" role="note">Demonstração · dados fictícios e somente leitura.</p>}
    {(error || message) && <p className={error ? 'form-error' : 'form-success'} role={error ? 'alert' : 'status'}>{error || message}</p>}
    <div className="grid cols-3"><div className="metric-card"><b>{due}</b><span>retornos vencidos</span></div>
      <div className="metric-card"><b>{recalls.length}</b><span>retornos registrados</span></div>
      <div className="metric-card"><b>{recalls.filter(r => r.status === 'scheduled').length}</b><span>agendados</span></div></div>
    {writable && <form className="card data-form inline-form" style={{ marginTop: 18 }} onSubmit={create}>
      <h2>Programar retorno</h2>
      <label>Paciente<select required value={patientId} onChange={e => setPatientId(e.target.value)}>
        <option value="">Selecione um paciente</option>{patients.filter(p => p.status === 'active').map(p => <option value={p.id} key={p.id}>{p.name}</option>)}
      </select></label>
      <label>Motivo<input required minLength={3} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>
      <label>Data prevista<input required type="date" value={dueAt} onChange={e => setDueAt(e.target.value)} /></label>
      <button className="btn primary" disabled={saving || loading} type="submit">{saving ? 'Salvando…' : 'Programar retorno'}</button>
    </form>}
    <div className="card table-card">
      <div className="agenda-toolbar">
        <label>Buscar paciente ou motivo <input type="search" value={term} onChange={e => { setTerm(e.target.value); setPage(1); }} /></label>
        <label>Filtrar por estado <select value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>
          <option value="all">Todos</option>{STATUS.map(s => <option value={s.value} key={s.value}>{s.label}</option>)}
        </select></label>
      </div>
      <table className="table clinical-stack-table"><caption className="sr-only">Retornos da clínica atual</caption><thead><tr><th>Paciente</th><th>Motivo</th><th>Data prevista</th><th>Estado</th><th>Ação</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={5}>Carregando retornos…</td></tr>
          : !visible.length ? <tr><td colSpan={5}>Nenhum retorno neste filtro.</td></tr>
          : visible.map(recall => <tr key={recall.id}>
            <td data-label="Paciente"><b>{nameById.get(recall.patientId) ?? 'Paciente indisponível'}</b></td>
            <td data-label="Motivo">{recall.reason}</td><td data-label="Data prevista">{new Date(recall.dueAt).toLocaleDateString('pt-BR', {timeZone:'UTC'})}</td>
            <td data-label="Estado"><span className={'status-pill ' + recallDisplayStatus(recall)}>{statusText(recallDisplayStatus(recall))}</span></td>
            <td data-label="Ação">{writable && recall.status !== 'dismissed' ? <button className="text-button" type="button" onClick={() => startEdit(recall)}>Atualizar</button> : '—'}</td>
          </tr>)}
      </tbody></table>
      <div className="agenda-toolbar">
        <span className="muted">{displayed.length} retorno(s) · página {Math.min(page, pageCount)} de {pageCount}</span>
        <button type="button" className="btn secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
        <button type="button" className="btn secondary" disabled={page >= pageCount} onClick={() => setPage(p => p + 1)}>Próxima</button>
      </div>
    </div>
    {writable && editing && <form className="card data-form inline-form" style={{ marginTop: 16 }} onSubmit={saveEdit}>
      <h2>Atualizar retorno de {nameById.get(editing.patientId)}</h2>
      <label>Motivo<input required minLength={3} maxLength={500} value={editReason} onChange={e => setEditReason(e.target.value)} /></label>
      <label>Data prevista<input required type="date" value={editDueAt} onChange={e => setEditDueAt(e.target.value)} /></label>
      <label>Estado<select value={editStatus} onChange={e => setEditStatus(e.target.value as RecallStatus)}>
        {STATUS.map(s => <option value={s.value} key={s.value}>{s.label}</option>)}
      </select></label>
      {editStatus === 'scheduled' && <label>Agendamento do paciente<select required value={appointmentId} onChange={e => setAppointmentId(e.target.value)}>
        <option value="">Selecione o agendamento</option>
        {appointments.filter(a => a.patientId === editing.patientId && !['cancelled','no_show'].includes(a.status)).map(a =>
          <option value={a.id} key={a.id}>{new Date(a.startsAt).toLocaleString('pt-BR')} · {a.status}</option>)}
      </select></label>}
      <div className="row-actions"><button className="btn primary" disabled={saving} type="submit">{saving ? 'Salvando…' : 'Salvar atualização'}</button>
        <button className="btn secondary" type="button" onClick={() => setEditing(null)}>Cancelar</button></div>
    </form>}
  </>;
}
