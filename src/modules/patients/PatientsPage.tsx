import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { demoPatients } from '../../sample/demoData';
import type { Patient } from '../../domain/types';
import { createTenantRecord, listTenantRecords, updateTenantRecord } from '../../lib/tenantData';
import { useTenantAccess } from '../tenant/TenantContext';

function searchValue(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
}

export function PatientsPage() {
  const { tenantSlug = 'demo-clinica' } = useParams();
  const session = useTenantAccess();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const rows = session.isDemo ? demoPatients : await listTenantRecords<Patient>(session, 'patients');
      setPatients([...rows].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
    } catch {
      setError('Não foi possível carregar os pacientes deste tenant.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void refresh(); }, [session]);

  async function createPatient(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      if (session.isDemo) throw new Error('Cadastros ficam desativados no modo demonstrativo.');
      const patientId = await createTenantRecord(session, 'patients', {
        name: name.trim(), phone: phone.trim(), email: email.trim(),
        searchName: searchValue(name), status: 'active',
      }, 'patients.manage', 'patient.create', 'patient');
      setName(''); setPhone(''); setEmail('');
      setMessage('Paciente cadastrado.');
      await refresh();
      return patientId;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível cadastrar o paciente.');
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(patient: Patient) {
    setError(''); setMessage('');
    try {
      await updateTenantRecord(session, 'patients', patient.id, { status: 'inactive' }, 'patients.manage', 'patient.deactivate', 'patient');
      setMessage('Paciente inativado. O histórico foi preservado.');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível inativar o paciente.');
    }
  }

  return <>
    <div className="page-head"><div><span className="eyebrow">Cadastro do tenant</span><h1>Pacientes</h1><p className="muted">Cada cadastro fica no tenant atual; inativar preserva o histórico.</p></div></div>
    {session.isDemo && <p className="demo-banner" role="note">Modo demonstrativo · registros fictícios e somente leitura.</p>}
    {(error || message) && <p className={error ? 'form-error' : 'form-success'} role={error ? 'alert' : 'status'}>{error || message}</p>}
    {session.permissions.includes('patients.manage') && !session.isDemo && <form className="card data-form inline-form" onSubmit={createPatient}>
      <h2>Novo paciente</h2>
      <label>Nome completo<input required maxLength={160} value={name} onChange={event => setName(event.target.value)} /></label>
      <label>Telefone<input maxLength={40} value={phone} onChange={event => setPhone(event.target.value)} /></label>
      <label>E-mail<input maxLength={254} type="email" value={email} onChange={event => setEmail(event.target.value)} /></label>
      <button className="btn primary" disabled={saving} type="submit">{saving ? 'Salvando…' : 'Cadastrar paciente'}</button>
    </form>}
    <div className="card table-card"><table className="table"><caption className="sr-only">Pacientes do tenant atual</caption><thead><tr><th>Paciente</th><th>Contato</th><th>Estado</th><th>Ações</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={4}>Carregando pacientes…</td></tr> : patients.length === 0 ? <tr><td colSpan={4}>Ainda não há pacientes cadastrados.</td></tr> : patients.map(patient => <tr key={patient.id}>
        <td><b>{patient.name}</b></td><td>{patient.phone || patient.email || '—'}</td><td><span className="status-pill">{patient.status}</span></td>
        <td className="row-actions">
          {session.permissions.includes('clinical.read') && <Link to={'/' + tenantSlug + '/app/pacientes/' + patient.id + '/clinico'}>Prontuário</Link>}
          {patient.status === 'active' && session.permissions.includes('patients.manage') && !session.isDemo && <button className="text-button" type="button" onClick={() => void deactivate(patient)}>Inativar</button>}
        </td>
      </tr>)}
    </tbody></table></div>
  </>;
}
