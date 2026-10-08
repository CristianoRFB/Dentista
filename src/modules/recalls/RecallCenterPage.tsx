import { useEffect, useState } from 'react';
import { demoPatients, demoRecalls } from '../../sample/demoData';
import type { Patient, Recall } from '../../domain/types';
import { listTenantRecords } from '../../lib/tenantData';
import { useTenantAccess } from '../tenant/TenantContext';

export function RecallCenterPage() {
  const session = useTenantAccess();
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [recallRows, patientRows] = session.isDemo
          ? [demoRecalls, demoPatients] as [Recall[], Patient[]]
          : await Promise.all([listTenantRecords<Recall>(session, 'recalls'), listTenantRecords<Patient>(session, 'patients')]);
        if (cancelled) return;
        setRecalls(recallRows); setPatients(patientRows); setError('');
      } catch {
        if (!cancelled) setError('Não foi possível carregar os retornos deste tenant.');
      } finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [session]);

  const patientName = (id: string) => patients.find(item => item.id === id)?.name ?? 'Paciente';
  const due = recalls.filter(item => item.status === 'due').length;
  return <>
    <div className="page-head"><div><span className="eyebrow">Relacionamento clínico</span><h1>Central de retorno</h1><p className="muted">Os registros exibidos vêm do tenant atual.</p></div></div>
    {session.isDemo && <p className="demo-banner">Modo demonstrativo · dados fictícios e somente leitura.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="grid cols-3"><div className="metric-card"><b>{due}</b><span>retornos vencidos</span></div><div className="metric-card"><b>{recalls.length}</b><span>retornos registrados</span></div><div className="metric-card"><b>{recalls.filter(item => item.status === 'planned').length}</b><span>planejados</span></div></div>
    <div className="card table-card"><table className="table"><caption className="sr-only">Retornos do tenant atual</caption><thead><tr><th>Paciente</th><th>Motivo</th><th>Previsão</th><th>Status</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={4}>Carregando retornos…</td></tr> : recalls.length === 0 ? <tr><td colSpan={4}>Ainda não há retornos registrados.</td></tr> : recalls.map(recall => <tr key={recall.id}>
        <td><b>{patientName(recall.patientId)}</b></td><td>{recall.reason}</td><td>{new Date(recall.dueAt).toLocaleDateString('pt-BR')}</td><td><span className={'status-pill ' + recall.status}>{recall.status}</span></td>
      </tr>)}
    </tbody></table></div>
    {!session.isDemo && <p className="muted">A criação e a gestão da Central de Retorno permanecem fora do escopo CORE_FIRST.</p>}
  </>;
}
