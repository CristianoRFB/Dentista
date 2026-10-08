import { FormEvent, useEffect, useState } from 'react';
import type { ScheduleResource } from '../../domain/types';
import { createTenantRecord, listTenantRecords, updateTenantRecord } from '../../lib/tenantData';
import { demoResources } from '../../sample/demoData';
import { useTenantAccess } from '../tenant/TenantContext';
import { canCreateCommercialCapacity, getEffectiveEntitlements } from '../../commercial/entitlementService';

export function ResourcesPage() {
  const session = useTenantAccess();
  const [resources, setResources] = useState<ScheduleResource[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<ScheduleResource['type']>('chair');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const entitlements = session.status === 'ready' ? getEffectiveEntitlements(session.tenant) : null;
  const activeCount = resources.filter(resource => resource.active).length;
  const limit = entitlements?.limits.resources ?? null;
  const canAddCapacity = session.status === 'ready' && canCreateCommercialCapacity(session.tenant);

  async function refresh() {
    try {
      setResources(session.isDemo ? demoResources : await listTenantRecords<ScheduleResource>(session, 'scheduleResources'));
      setError('');
    } catch {
      setError('Não foi possível carregar os recursos da agenda.');
    }
  }
  useEffect(() => { void refresh(); }, [session]);

  async function addResource(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await createTenantRecord(session, 'scheduleResources', { name: name.trim(), type, active: true }, 'resources.manage', 'resource.create', 'scheduleResource');
      setName('');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível cadastrar o recurso.');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(resource: ScheduleResource) {
    try {
      await updateTenantRecord(session, 'scheduleResources', resource.id, { active: !resource.active }, 'resources.manage', resource.active ? 'resource.deactivate' : 'resource.activate', 'scheduleResource');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar o recurso.');
    }
  }

  return <>
    <div className="page-head"><div><span className="eyebrow">Agenda</span><h1>Cadeiras e salas</h1><p className="muted">Recursos físicos ativos podem ser reservados pelos agendamentos.</p></div></div>
    {session.isDemo && <p className="demo-banner">Modo demonstrativo · dados fictícios e somente leitura.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {session.permissions.includes('resources.manage') && !session.isDemo && <form className="card data-form inline-form" onSubmit={addResource}>
      <h2>Novo recurso</h2>
      <p className="muted">Ativos: {activeCount}/{limit ?? '—'}.</p>
      <label>Nome<input required maxLength={100} value={name} onChange={event => setName(event.target.value)} /></label>
      <label>Tipo<select value={type} onChange={event => setType(event.target.value as ScheduleResource['type'])}><option value="chair">Cadeira</option><option value="room">Sala</option><option value="equipment">Equipamento</option></select></label>
      <button className="btn primary" disabled={saving || !canAddCapacity || activeCount >= (limit ?? 0)} type="submit">{saving ? 'Salvando…' : 'Adicionar recurso'}</button>
    </form>}
    <div className="grid cols-3">{resources.length === 0 ? <article className="card"><p>Ainda não há recursos cadastrados.</p></article> : resources.map(resource => <article className="card resource-card" key={resource.id}>
      <span className="feature-icon">{resource.type === 'chair' ? '⌁' : resource.type === 'room' ? '□' : '◌'}</span>
      <h3>{resource.name}</h3><p className="muted">{resource.type === 'chair' ? 'Cadeira' : resource.type === 'room' ? 'Sala' : 'Equipamento'}</p>
      <span className="status-pill">{resource.active ? 'ativo' : 'inativo'}</span>
      {session.permissions.includes('resources.manage') && !session.isDemo && <button className="text-button" type="button" onClick={() => void toggle(resource)}>{resource.active ? 'Inativar' : 'Ativar'}</button>}
    </article>)}</div>
  </>;
}
