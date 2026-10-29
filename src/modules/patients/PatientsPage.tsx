import { FormEvent, useEffect, useMemo, useState } from 'react';
import { filterPatients, pagePatients, type PatientStateFilter } from '../../lib/patientList';
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
  const [query,setQuery] = useState('');
  const [stateFilter,setStateFilter] = useState<PatientStateFilter>('active');
  const [page,setPage] = useState(1);
  const [confirmId,setConfirmId] = useState<string|null>(null);

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

  const filtered = useMemo(()=>filterPatients(patients,query,stateFilter),[patients,query,stateFilter]);
  const paginated = useMemo(()=>pagePatients(filtered,page),[filtered,page]);
  useEffect(()=>setPage(1),[query,stateFilter]);

  async function deactivate(patient: Patient) {
    setError(''); setMessage('');
    try {
      await updateTenantRecord(session, 'patients', patient.id, { status: 'inactive' }, 'patients.manage', 'patient.deactivate', 'patient');
      setMessage('Paciente inativado. O histórico foi preservado.');
      setConfirmId(null);
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
    <div className="card table-card">
      <div className="clinical-list-toolbar">
        <label>Buscar paciente
          <input type="search" autoComplete="off" value={query} onChange={event=>setQuery(event.target.value)}
            placeholder="Nome, telefone ou e-mail" aria-label="Buscar paciente pelo nome ou contato"/>
        </label>
        <label>Estado
          <select value={stateFilter} onChange={event=>setStateFilter(event.target.value as PatientStateFilter)}>
            <option value="active">Ativos</option><option value="inactive">Inativos</option><option value="all">Todos</option>
          </select>
        </label>
      </div>
      <p role="status" className="muted">{loading?'Carregando…':paginated.total+' paciente(s) nesta busca.'}</p>
      <table className="table clinical-patient-table"><caption className="sr-only">Pacientes do tenant atual, filtrados e paginados</caption><thead>
        <tr><th>Paciente</th><th>Contato</th><th>Estado</th><th>Ações</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={4}>Carregando pacientes…</td></tr>
        : filtered.length === 0 ? <tr><td colSpan={4}>Nenhum paciente corresponde aos filtros.</td></tr>
        : paginated.rows.map(patient=><tr key={patient.id}>
          <td data-label="Paciente"><b>{patient.name}</b></td>
          <td data-label="Contato">{patient.phone || patient.email || '—'}</td>
          <td data-label="Estado"><span className="status-pill">{patient.status === 'active'?'Ativo':'Inativo'}</span></td>
          <td data-label="Ações" className="row-actions">
            {session.permissions.includes('clinical.read') && <Link to={'/'+tenantSlug+'/app/pacientes/'+patient.id+'/clinico'}>Prontuário</Link>}
            {session.permissions.includes('clinical.read') && <Link to={'/'+tenantSlug+'/app/pacientes/'+patient.id+'/odontograma'}>Odontograma</Link>}
            {session.permissions.includes('clinical.read') && <Link to={'/'+tenantSlug+'/app/pacientes/'+patient.id+'/tratamento'}>Tratamento</Link>}
            {patient.status === 'active' && session.permissions.includes('patients.manage') && !session.isDemo &&
              (confirmId === patient.id ? <>
                <span>Inativar {patient.name}?</span>
                <button className="text-button" type="button" onClick={()=>void deactivate(patient)}>Confirmar</button>
                <button className="text-button" type="button" onClick={()=>setConfirmId(null)}>Cancelar</button>
              </> : <button className="text-button" type="button" onClick={()=>setConfirmId(patient.id)}>Inativar</button>)}
          </td>
        </tr>)}
      </tbody></table>
      {!loading&&paginated.pages>1&&<nav className="clinical-list-actions" aria-label="Páginas de pacientes">
        <button className="btn secondary" type="button" disabled={paginated.page===1}
          onClick={()=>setPage(paginated.page-1)}>Anterior</button>
        <span aria-live="polite">Página {paginated.page} de {paginated.pages}</span>
        <button className="btn secondary" type="button" disabled={paginated.page===paginated.pages}
          onClick={()=>setPage(paginated.page+1)}>Próxima</button>
      </nav>}
      <small className="muted">Paginação da lista carregada nesta sessão; não representa paginação de consulta Firestore.</small>
    </div>
  </>;
}
