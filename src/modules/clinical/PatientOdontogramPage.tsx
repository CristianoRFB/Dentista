import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import type { OdontogramEvent, Patient } from '../../domain/types';
import { ADULT_TOOTH_ROWS, FINDINGS, latestToothEvent, PRIMARY_TOOTH_ROWS, SURFACES } from '../../domain/odontogram';
import { addOdontogramEvent, listOdontogramEvents } from '../../lib/odontogramData';
import { db } from '../../lib/firebase';
import { demoPatients } from '../../sample/demoData';
import { useReadyTenantAccess } from '../tenant/TenantContext';

const findingLabels: Record<string, string> = {
  observed: 'Observação clínica', caries: 'Suspeita de cárie registrada',
  restoration: 'Restauração', missing: 'Ausência registrada',
  endodontic: 'Tratamento endodôntico', prosthetic: 'Prótese', other: 'Outra condição',
};
const surfaceLabels: Record<string, string> = {
  whole: 'Dente inteiro', mesial: 'Mesial', distal: 'Distal', occlusal: 'Oclusal',
  incisal: 'Incisal', buccal: 'Vestibular', lingual: 'Lingual', palatal: 'Palatina',
};
const fakeEvents: OdontogramEvent[] = [
  { id: 'demo-e1', tenantId: 'tenant_demo', patientId: 'p1', toothId: '16', surface: 'occlusal',
    finding: 'restoration', note: 'Exemplo inteiramente fictício; não representa atendimento real.',
    createdAt: '2026-09-15T12:00:00Z', createdBy: 'profissional-demo', auditLogId: 'demo-audit-1' },
];

function todayView(iso: string) {
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('pt-BR') : 'Data indisponível';
}

export function PatientOdontogramPage() {
  const { tenantSlug = '', patientId = '' } = useParams();
  const session = useReadyTenantAccess();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [events, setEvents] = useState<OdontogramEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState('16');
  const [surface, setSurface] = useState<string>('whole');
  const [finding, setFinding] = useState<string>('observed');
  const [note, setNote] = useState('');
  const [supersedesEventId, setSupersedesEventId] = useState('');

  async function refresh() {
    setLoading(true);
    try {
      if (session.isDemo) {
        setPatient(demoPatients.find(p => p.id === patientId) ?? null);
        setEvents(fakeEvents.filter(e => e.patientId === patientId));
      } else {
        const patientSnap = await getDoc(doc(db, 'tenants', session.tenant.id, 'patients', patientId));
        if (!patientSnap.exists() || patientSnap.data().tenantId !== session.tenant.id) throw new Error('Paciente não encontrado nesta clínica.');
        const rows = await listOdontogramEvents(session, patientId);
        setPatient({ ...patientSnap.data(), id: patientSnap.id } as Patient);
        setEvents(rows);
      }
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível abrir o odontograma.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, [session, patientId]);

  const byTooth = useMemo(() => [...events].sort((a,b) => b.createdAt.localeCompare(a.createdAt)), [events]);
  const selectedEvents = byTooth.filter(e => e.toothId === selected);
  const latest = latestToothEvent(events, selected);
  const canWrite = !session.isDemo && session.permissions.includes('clinical.write') && patient?.status === 'active';

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(''); setMessage(''); setSaving(true);
    try {
      await addOdontogramEvent(session, patientId, {
        toothId: selected, surface, finding, note, ...(supersedesEventId ? { supersedesEventId } : {}),
      });
      setSupersedesEventId(''); setNote('');
      await refresh(); setMessage('Novo evento clínico registrado. O histórico anterior foi preservado.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível registrar o evento.'); }
    finally { setSaving(false); }
  }

  if (!session.permissions.includes('clinical.read')) {
    return <div className="state-page" role="alert"><h1>Acesso clínico negado</h1><p>Odontogramas exigem autorização clínica.</p></div>;
  }

  return <div className="odontogram-page">
    <div className="page-head"><div><span className="eyebrow">Prontuário protegido · FDI</span><h1>Odontograma de {patient?.name ?? 'paciente'}</h1>
      <p className="muted">Condições inseridas por profissional autorizado. Cada alteração cria um novo evento, com autoria e data.</p></div>
      <Link className="btn secondary" to={'/' + tenantSlug + '/app/pacientes/' + patientId + '/clinico'}>Voltar ao prontuário</Link>
    </div>
    {session.isDemo && <p className="demo-banner">Exemplo totalmente fictício · somente leitura.</p>}
    {(error || message) && <p className={error ? 'form-error' : 'form-success'} role={error ? 'alert' : 'status'}>{error || message}</p>}
    {loading ? <p role="status">Carregando odontograma…</p> : !patient ? <p role="alert">Paciente não encontrado.</p> : <>
      <section className="card" aria-labelledby="teeth-title">
        <h2 id="teeth-title">Mapa dentário interativo</h2>
        <p className="muted">Selecione o número FDI. A marca indica dentes com eventos registrados, não um diagnóstico automatizado.</p>
        <h3>Dentição permanente</h3>
        {ADULT_TOOTH_ROWS.map((row, i) => <div className="tooth-grid" key={i} role="group" aria-label={'Arcada permanente ' + (i + 1)}>
          {row.map(id => <button type="button" key={id} aria-pressed={selected === id}
            className={'tooth-button' + (selected === id ? ' selected' : '') + (events.some(e => e.toothId === id) ? ' has-event' : '')}
            onClick={() => { setSelected(id); setSupersedesEventId(''); }}>
            {id}<small>{events.some(e => e.toothId === id) ? '•' : '—'}</small>
          </button>)}</div>)}
        <h3>Dentição decídua</h3>
        {PRIMARY_TOOTH_ROWS.map((row, i) => <div className="tooth-grid" key={'primary-' + i} role="group" aria-label={'Arcada decídua ' + (i + 1)}>
          {row.map(id => <button type="button" key={id} aria-pressed={selected === id}
            className={'tooth-button' + (selected === id ? ' selected' : '') + (events.some(e => e.toothId === id) ? ' has-event' : '')}
            onClick={() => { setSelected(id); setSupersedesEventId(''); }}>
            {id}<small>{events.some(e => e.toothId === id) ? '•' : '—'}</small>
          </button>)}</div>)}
        <p className="muted">Legenda: • evento registrado · — sem evento · destaque = dente selecionado.</p>
      </section>

      <section className="card" style={{marginTop:16}} aria-labelledby="tooth-history-title">
        <h2 id="tooth-history-title">Dente {selected} · histórico clínico</h2>
        <p className="muted">{latest ? 'Último evento: ' + (findingLabels[latest.finding] ?? latest.finding) : 'Nenhuma condição registrada para este dente.'}</p>
        {selectedEvents.map(row => <article className="clinical-amendment" key={row.id}>
          <b>{findingLabels[row.finding] ?? row.finding} · {surfaceLabels[row.surface] ?? row.surface}</b>
          <p>{row.note || 'Sem observação adicional.'}</p>
          <small>Registrado em {todayView(row.createdAt)} · autoria: {row.createdBy}</small>
          {row.supersedesEventId && <p><small>Correção/adendo ao evento {row.supersedesEventId}; original preservado.</small></p>}
          {canWrite && <button className="text-button" type="button" onClick={() => {
            setSelected(row.toothId); setSurface(row.surface); setFinding(row.finding); setSupersedesEventId(row.id); setNote('');
          }}>Registrar correção por novo evento</button>}
        </article>)}
      </section>

      {canWrite && <form className="card data-form clinical-form" style={{marginTop:16}} onSubmit={submit}>
        <h2>{supersedesEventId ? 'Registrar correção' : 'Registrar novo evento'} · dente {selected}</h2>
        {supersedesEventId && <p className="muted">O evento original não será editado. A correção terá autoria própria.</p>}
        <div className="form-grid">
          <label>Superfície<select value={surface} onChange={e => setSurface(e.target.value)}>
            {SURFACES.map(s => <option value={s} key={s}>{surfaceLabels[s]}</option>)}
          </select></label>
          <label>Condição observada<select value={finding} onChange={e => setFinding(e.target.value)}>
            {FINDINGS.map(s => <option value={s} key={s}>{findingLabels[s]}</option>)}
          </select></label>
        </div>
        <label>Observação do profissional<textarea maxLength={4000} value={note} onChange={e => setNote(e.target.value)}
          placeholder="Descrição clínica inserida pelo profissional; não inclui diagnóstico automático." /></label>
        <div className="form-actions"><button type="submit" className="btn primary" disabled={saving}>{saving ? 'Salvando…' : 'Registrar evento'}</button>
          {supersedesEventId && <button type="button" className="btn secondary" onClick={() => setSupersedesEventId('')}>Cancelar correção</button>}
        </div>
      </form>}
    </>}
  </div>;
}
