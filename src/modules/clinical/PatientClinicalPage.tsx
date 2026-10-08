import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import type { ClinicalRecord, ClinicalRecordAmendment, Patient, Professional } from '../../domain/types';
import { db } from '../../lib/firebase';
import { addClinicalAmendment, addPatientClinicalRecord, listPatientRecords, listTenantRecords } from '../../lib/tenantData';
import { useReadyTenantAccess } from '../tenant/TenantContext';

export function PatientClinicalPage() {
  const { tenantSlug = 'demo-clinica', patientId = '' } = useParams();
  const session = useReadyTenantAccess();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [amendments, setAmendments] = useState<ClinicalRecordAmendment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [recordType, setRecordType] = useState<ClinicalRecord['recordType']>('evolution');
  const [professionalId, setProfessionalId] = useState('');
  const [content, setContent] = useState('');
  const [editingAmendment, setEditingAmendment] = useState<ClinicalRecord | null>(null);
  const [reason, setReason] = useState('');
  const [amendmentContent, setAmendmentContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function refresh() {
    setLoading(true); setError('');
    try {
      if (session.isDemo) {
        setPatient(null); setRecords([]); setAmendments([]); setProfessionals([]);
        setLoading(false); return;
      }
      const patientSnapshot = await getDoc(doc(db, 'tenants', session.tenant.id, 'patients', patientId));
      if (!patientSnapshot.exists() || patientSnapshot.data().tenantId !== session.tenant.id) throw new Error('Paciente não encontrado neste tenant.');
      const [recordRows, amendmentRows, professionalRows] = await Promise.all([
        listPatientRecords<ClinicalRecord>(session, patientId, 'clinicalRecords'),
        listPatientRecords<ClinicalRecordAmendment>(session, patientId, 'clinicalRecordAmendments'),
        listTenantRecords<Professional>(session, 'professionals'),
      ]);
      setPatient({ ...patientSnapshot.data(), id: patientSnapshot.id } as Patient);
      setRecords(recordRows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setAmendments(amendmentRows.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      setProfessionals(professionalRows.filter(item => item.status === 'active'));
      if (!professionalId && professionalRows.length) setProfessionalId(professionalRows.find(item => item.status === 'active')?.id ?? '');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o prontuário.');
    } finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, [session, patientId]);

  async function submitRecord(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    if (!professionalId || !content.trim()) { setError('Selecione o profissional responsável e informe a evolução.'); return; }
    setSaving(true);
    try {
      await addPatientClinicalRecord(session, patientId, { dentistId: professionalId, recordType, content: content.trim() });
      setContent(''); setMessage('Registro adicionado ao prontuário.'); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível registrar a evolução.'); }
    finally { setSaving(false); }
  }

  async function submitAmendment(event: FormEvent) {
    event.preventDefault();
    if (!editingAmendment) return;
    setError(''); setMessage(''); setSaving(true);
    try {
      await addClinicalAmendment(session, patientId, editingAmendment.id, { reason: reason.trim(), content: amendmentContent.trim(), professionalId: professionalId || undefined });
      setEditingAmendment(null); setReason(''); setAmendmentContent(''); setMessage('Adendo anexado. O registro original foi preservado.'); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível adicionar o adendo.'); }
    finally { setSaving(false); }
  }

  if (!session.permissions.includes('clinical.read')) return <main className="state-page"><h1>Acesso clínico negado</h1><p>Seu perfil não permite consultar prontuários.</p><Link to={'/' + tenantSlug + '/app'}>Voltar ao painel</Link></main>;
  if (session.isDemo) return <main className="state-page"><p className="demo-banner">Modo demonstrativo · nenhum prontuário clínico fictício é exibido.</p><h1>Prontuário</h1><p>Conecte-se a um tenant de teste para consultar registros clínicos.</p></main>;

  return <>
    <div className="page-head"><div><span className="eyebrow">Registro clínico protegido</span><h1>{patient?.name ?? 'Prontuário do paciente'}</h1><p className="muted">Registros são append-only. Correções entram como adendos com autoria e horário.</p></div><Link className="btn secondary" to={'/' + tenantSlug + '/app/pacientes'}>Voltar aos pacientes</Link></div>
    {(error || message) && <p className={error ? 'form-error' : 'form-success'} role={error ? 'alert' : 'status'}>{error || message}</p>}
    {session.permissions.includes('clinical.write') && <form className="card data-form clinical-form" onSubmit={submitRecord}>
      <h2>Novo registro</h2><div className="form-grid">
        <label>Tipo<select value={recordType} onChange={event => setRecordType(event.target.value as ClinicalRecord['recordType'])}><option value="evolution">Evolução</option><option value="procedure">Procedimento</option><option value="note">Nota clínica</option></select></label>
        <label>Profissional responsável<select required value={professionalId} onChange={event => setProfessionalId(event.target.value)}><option value="">Selecione</option>{professionals.map(person => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select></label>
      </div>
      <label>Registro clínico<textarea required minLength={1} maxLength={12000} value={content} onChange={event => setContent(event.target.value)} /></label>
      <button className="btn primary" disabled={saving} type="submit">{saving ? 'Salvando…' : 'Adicionar registro'}</button>
    </form>}
    {editingAmendment && <form className="card data-form clinical-form" onSubmit={submitAmendment}>
      <h2>Adicionar adendo</h2><p className="muted">Este texto será anexado ao registro; o original não pode ser alterado.</p>
      <label>Motivo<input required minLength={5} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label>
      <label>Adendo<textarea required minLength={1} maxLength={12000} value={amendmentContent} onChange={event => setAmendmentContent(event.target.value)} /></label>
      <div className="form-actions"><button className="btn primary" disabled={saving} type="submit">Salvar adendo</button><button className="btn secondary" type="button" onClick={() => setEditingAmendment(null)}>Cancelar</button></div>
    </form>}
    <section aria-labelledby="records-heading"><h2 id="records-heading">Linha do tempo clínica</h2>{loading ? <p role="status">Carregando registros…</p> : records.length === 0 ? <div className="card"><p>Nenhum registro clínico neste prontuário.</p></div> : <div className="clinical-timeline">
      {records.map(record => <article className="card clinical-record" key={record.id}>
        <div className="card-title"><div><span className="eyebrow">{record.recordType}</span><h3>{new Date(record.createdAt).toLocaleString('pt-BR')}</h3></div>{session.permissions.includes('clinical.write') && <button className="text-button" type="button" onClick={() => { setEditingAmendment(record); setReason(''); setAmendmentContent(''); }}>Adicionar adendo</button>}</div>
        <p className="clinical-content">{record.content}</p><small>Profissional: {professionals.find(person => person.id === record.dentistId)?.displayName ?? 'não identificado'} · autoria: {record.createdBy}</small>
        {amendments.filter(item => item.recordId === record.id).map(amendment => <div className="clinical-amendment" key={amendment.id}><b>Adendo · {new Date(amendment.createdAt).toLocaleString('pt-BR')}</b><p>{amendment.reason}</p><p className="clinical-content">{amendment.content}</p></div>)}
      </article>)}
    </div>}</section>
  </>;
}
