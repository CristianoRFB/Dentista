import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PRODUCT_STANDARDS } from '../../config/standards';
import type { Tenant, TenantBranding } from '../../domain/types';
import type { SubscriptionStatus } from '../../domain/types';
import { PLAN_CATALOG, type PaidPlanId } from '../../commercial/planCatalog';
import { getEffectiveEntitlements } from '../../commercial/entitlementService';
import {
  createPlatformTenant, grantClinicalSupport, listActiveSupportAccess, listPlatformTenants,
  revokeClinicalSupport, setPlatformTenantStatus, updatePlatformTenantBranding, updatePlatformTenantCommercialState,
} from '../../lib/platformData';
import { isValidTenantSlug } from '../tenant/tenantResolver';
import { useAuth } from '../auth/AuthProvider';

type SupportRow = { tenantId: string; actorId: string; reason: string; expiresAt?: { toDate?: () => Date }; revokedAt?: unknown };

const defaultBranding = (tenant: Tenant): TenantBranding => ({
  ...tenant.branding,
  publicName: tenant.branding?.publicName ?? tenant.name,
  primaryColor: tenant.branding?.primaryColor ?? '#163d3a',
  accentColor: tenant.branding?.accentColor ?? '#72b9ad',
});
type CommercialForm = { planId: PaidPlanId; status: Exclude<SubscriptionStatus, 'demo'>; trialUntil: string; entitlementsJson: string; limitsJson: string; reason: string };

function localDateInput(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function isoDate(value: string) { return value ? new Date(value).toISOString() : undefined; }

function parseOverrides<T extends Record<string, unknown>>(value: string, label: string): T {
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error(label + ' deve estar em JSON válido.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(label + ' deve ser um objeto JSON.');
  return parsed as T;
}

export function PlatformDashboard() {
  const { user, signOutUser } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [supportRows, setSupportRows] = useState<SupportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [tenantForm, setTenantForm] = useState({ name: '', slug: '', ownerUid: '', publicName: '', primaryColor: '#163d3a', accentColor: '#72b9ad', planId: 'essential' as PaidPlanId, status: 'active' as Exclude<SubscriptionStatus, 'demo'>, trialUntil: '', reason: '' });
  const [supportForm, setSupportForm] = useState({ tenantId: '', reason: '', minutes: '60' });
  const [brandingForms, setBrandingForms] = useState<Record<string, TenantBranding>>({});
  const [commercialForms, setCommercialForms] = useState<Record<string, CommercialForm>>({});

  async function refresh() {
    setLoading(true); setError('');
    try {
      const [tenantRows, support] = await Promise.all([listPlatformTenants(), listActiveSupportAccess()]);
      setTenants(tenantRows.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
      setSupportRows(support as SupportRow[]);
      setBrandingForms(Object.fromEntries(tenantRows.map(tenant => [tenant.id, defaultBranding(tenant)])));
      setCommercialForms(Object.fromEntries(tenantRows.map(tenant => [tenant.id, {
        planId: tenant.planId === 'pro' || tenant.planId === 'premium' ? tenant.planId : 'essential',
        status: (tenant.subscriptionStatus === 'demo' ? 'active' : tenant.subscriptionStatus ?? 'active') as Exclude<SubscriptionStatus, 'demo'>,
        trialUntil: localDateInput(tenant.trialUntil),
        entitlementsJson: JSON.stringify(tenant.entitlementOverrides ?? {}, null, 2),
        limitsJson: JSON.stringify(tenant.limitOverrides ?? {}, null, 2), reason: '',
      }])));
    } catch {
      setError('Não foi possível carregar os dados da plataforma.');
    } finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);

  async function createTenant(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage(''); setSaving(true);
    try {
      if (!user) throw new Error('Entre com uma conta Platform Owner.');
      const slug = tenantForm.slug.trim().toLowerCase();
      if (!isValidTenantSlug(slug)) throw new Error('Use um slug com letras minúsculas, números e hífens.');
      await createPlatformTenant({ ...tenantForm, subscriptionStatus: tenantForm.status, trialUntil: isoDate(tenantForm.trialUntil) }, user.uid);
      setTenantForm({ name: '', slug: '', ownerUid: '', publicName: '', primaryColor: '#163d3a', accentColor: '#72b9ad', planId: 'essential', status: 'active', trialUntil: '', reason: '' });
      setMessage('Tenant criado com slug, branding público inicial, membership do owner e auditoria.');
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível criar o tenant.'); }
    finally { setSaving(false); }
  }

  async function changeStatus(tenant: Tenant) {
    setError(''); setMessage('');
    try {
      if (!user) throw new Error('Sessão encerrada.');
      const status = tenant.status === 'active' ? 'suspended' : 'active';
      await setPlatformTenantStatus(tenant, status, user.uid);
      setMessage(status === 'suspended' ? 'Tenant suspenso. Os dados foram preservados.' : 'Tenant reativado.');
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível alterar o estado do tenant.'); }
  }

  async function saveBranding(tenant: Tenant) {
    setError(''); setMessage('');
    try {
      if (!user) throw new Error('Sessão encerrada.');
      await updatePlatformTenantBranding(tenant, brandingForms[tenant.id] ?? defaultBranding(tenant), user.uid);
      setMessage('Branding público atualizado.');
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar o branding.'); }
  }

  async function saveCommercialState(tenant: Tenant) {
    setError(''); setMessage('');
    try {
      if (!user) throw new Error('Sessão encerrada.');
      const form = commercialForms[tenant.id];
      if (!form) throw new Error('Estado comercial indisponível.');
      await updatePlatformTenantCommercialState(tenant, {
        planId: form.planId, subscriptionStatus: form.status, trialUntil: isoDate(form.trialUntil),
        entitlementOverrides: parseOverrides<Record<string, boolean>>(form.entitlementsJson, 'Overrides de entitlement'),
        limitOverrides: parseOverrides<Record<string, number | null>>(form.limitsJson, 'Overrides de limite'),
        reason: form.reason,
      }, user.uid);
      setMessage('Plano, estado e overrides comerciais atualizados com auditoria.');
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar o estado comercial.'); }
  }

  async function grantSupport(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    try {
      if (!user) throw new Error('Sessão encerrada.');
      await grantClinicalSupport(supportForm.tenantId, supportForm.reason, Number(supportForm.minutes), user.uid);
      setSupportForm(current => ({ ...current, reason: '' }));
      setMessage('Acesso clínico temporário ativado e auditado.');
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível ativar o suporte.'); }
  }

  async function revokeSupport(tenantId: string) {
    setError(''); setMessage('');
    try {
      if (!user) throw new Error('Sessão encerrada.');
      await revokeClinicalSupport(tenantId, user.uid);
      setMessage('Acesso de suporte revogado e auditado.');
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível revogar o suporte.'); }
  }

  const activeSupport = supportRows.filter(row => !row.revokedAt && (row.expiresAt?.toDate?.().getTime() ?? 0) > Date.now());

  return <main className="content platform-page">
    <div className="page-head"><div><span className="eyebrow">Platform Owner</span><h1>Painel da plataforma</h1><p className="muted">Administração de tenants sem acesso clínico casual.</p></div><button className="btn secondary" type="button" onClick={() => void signOutUser()}>Sair</button></div>
    {(error || message) && <p className={error ? 'form-error' : 'form-success'} role={error ? 'alert' : 'status'}>{error || message}</p>}
    <div className="grid cols-4"><div className="metric-card"><b>{tenants.length}</b><span>tenants reais</span></div><div className="metric-card"><b>{activeSupport.length}</b><span>suportes clínicos ativos</span></div><div className="metric-card"><b>{PRODUCT_STANDARDS.global}</b><span>padrão global</span></div><div className="metric-card"><b>{PRODUCT_STANDARDS.vertical}</b><span>vertical de agendamento</span></div></div>

    <form className="card data-form platform-form" onSubmit={createTenant}>
      <h2>Criar tenant</h2>
      <p className="muted">O owner precisa ter uma conta Firebase Auth existente. Atribua manualmente um plano e registre o motivo; não há cobrança automática.</p>
      <div className="form-grid">
        <label>Nome da clínica<input required maxLength={160} value={tenantForm.name} onChange={event => setTenantForm(current => ({ ...current, name: event.target.value }))} /></label>
        <label>Slug público<input required maxLength={48} value={tenantForm.slug} onChange={event => setTenantForm(current => ({ ...current, slug: event.target.value }))} /></label>
        <label>UID do owner inicial<input required maxLength={128} value={tenantForm.ownerUid} onChange={event => setTenantForm(current => ({ ...current, ownerUid: event.target.value }))} /></label>
        <label>Nome público<input required maxLength={160} value={tenantForm.publicName} onChange={event => setTenantForm(current => ({ ...current, publicName: event.target.value }))} /></label>
        <label>Cor principal<input type="color" value={tenantForm.primaryColor} onChange={event => setTenantForm(current => ({ ...current, primaryColor: event.target.value }))} /></label>
        <label>Cor de destaque<input type="color" value={tenantForm.accentColor} onChange={event => setTenantForm(current => ({ ...current, accentColor: event.target.value }))} /></label>
        <label>Plano<select value={tenantForm.planId} onChange={event => setTenantForm(current => ({ ...current, planId: event.target.value as PaidPlanId }))}>{Object.values(PLAN_CATALOG).map(plan => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>
        <label>Estado comercial<select value={tenantForm.status} onChange={event => setTenantForm(current => ({ ...current, status: event.target.value as Exclude<SubscriptionStatus, 'demo'> }))}><option value="active">Ativo</option><option value="trial">Trial</option><option value="past_due">Pagamento pendente</option><option value="suspended">Suspenso</option><option value="cancelled">Cancelado</option></select></label>
        {tenantForm.status === 'trial' && <label>Trial termina em<input required type="datetime-local" value={tenantForm.trialUntil} onChange={event => setTenantForm(current => ({ ...current, trialUntil: event.target.value }))} /></label>}
        <label>Motivo da atribuição<input required minLength={12} maxLength={400} value={tenantForm.reason} onChange={event => setTenantForm(current => ({ ...current, reason: event.target.value }))} /><small>Não inclua dados de pacientes ou segredos.</small></label>
      </div>
      <button className="btn primary" disabled={saving} type="submit">{saving ? 'Criando…' : 'Criar tenant e membership'}</button>
    </form>

    <form className="card data-form support-form" onSubmit={grantSupport}>
      <h2>Suporte clínico temporário</h2>
      <p className="muted">Registre um motivo. O acesso expira automaticamente em até 8 horas e pode ser revogado antes.</p>
      <div className="form-grid">
        <label>Tenant<select required value={supportForm.tenantId} onChange={event => setSupportForm(current => ({ ...current, tenantId: event.target.value }))}><option value="">Selecione</option>{tenants.map(tenant => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
        <label>Motivo<input required minLength={12} maxLength={400} value={supportForm.reason} onChange={event => setSupportForm(current => ({ ...current, reason: event.target.value }))} /></label>
        <label>Duração (minutos)<input required type="number" min="5" max="480" step="5" value={supportForm.minutes} onChange={event => setSupportForm(current => ({ ...current, minutes: event.target.value }))} /></label>
      </div>
      <button className="btn secondary" type="submit">Ativar suporte</button>
      {activeSupport.map(row => <p className="support-row" key={row.tenantId}><span>{tenants.find(tenant => tenant.id === row.tenantId)?.name ?? row.tenantId} · expira {row.expiresAt?.toDate?.().toLocaleString('pt-BR') ?? '—'} · {row.reason}</span><button className="text-button" type="button" onClick={() => void revokeSupport(row.tenantId)}>Revogar</button></p>)}
    </form>

    <div className="card table-card"><div className="card-title"><h2>Tenants</h2><span className="muted">Dados reais · sem acesso clínico neste painel</span></div>
      {loading ? <p role="status">Carregando tenants…</p> : <table className="table"><caption className="sr-only">Tenants cadastrados na plataforma</caption><thead><tr><th>Nome</th><th>Slug</th><th>Status do tenant</th><th>Plano</th><th>Estado comercial</th><th>Ações</th></tr></thead><tbody>
        {tenants.length === 0 ? <tr><td colSpan={6}>Ainda não há tenants cadastrados.</td></tr> : tenants.map(tenant => <tr key={tenant.id}>
          <td><b>{tenant.name}</b></td><td><Link to={'/' + tenant.slug}>{tenant.slug}</Link></td><td><span className="status-pill">{tenant.status}</span></td>
          <td>{tenant.planId && tenant.planId !== 'premium_demo' ? PLAN_CATALOG[tenant.planId]?.name ?? 'Sem plano' : 'Sem plano'}{tenant.entitlementOverrides && Object.keys(tenant.entitlementOverrides).length > 0 ? ' · entitlement override' : ''}{tenant.limitOverrides && Object.keys(tenant.limitOverrides).length > 0 ? ' · limite override' : ''}</td>
          <td><span className="status-pill">{tenant.subscriptionStatus ?? 'não atribuído'}</span>{tenant.trialUntil ? <small> · até {new Date(tenant.trialUntil).toLocaleString('pt-BR')}</small> : null}</td>
          <td><button className="text-button" type="button" onClick={() => void changeStatus(tenant)}>{tenant.status === 'active' ? 'Suspender' : 'Ativar'}</button></td>
        </tr>)}
      </tbody></table>}
    </div>
    {tenants.map(tenant => {
      const form = commercialForms[tenant.id];
      const effective = getEffectiveEntitlements(tenant);
      return <details className="card platform-commercial" key={tenant.id}>
        <summary>Plano e entitlements de {tenant.name}</summary>
        <p className="muted">Efetivo agora: {effective.planId ? PLAN_CATALOG[effective.planId].name : 'sem plano'} · {tenant.subscriptionStatus ?? 'estado não atribuído'}{effective.trialExpired ? ' · trial expirado' : ''}. Features são limitadas pelo código implementado e pelo flag operacional.</p>
        {form && <div className="form-grid">
          <label>Plano<select value={form.planId} onChange={event => setCommercialForms(rows => ({ ...rows, [tenant.id]: { ...form, planId: event.target.value as PaidPlanId } }))}>{Object.values(PLAN_CATALOG).map(plan => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>
          <label>Estado comercial<select value={form.status} onChange={event => setCommercialForms(rows => ({ ...rows, [tenant.id]: { ...form, status: event.target.value as Exclude<SubscriptionStatus, 'demo'> } }))}><option value="active">Ativo</option><option value="trial">Trial</option><option value="past_due">Pagamento pendente</option><option value="suspended">Suspenso</option><option value="cancelled">Cancelado</option></select></label>
          {form.status === 'trial' && <label>Trial termina em<input required type="datetime-local" value={form.trialUntil} onChange={event => setCommercialForms(rows => ({ ...rows, [tenant.id]: { ...form, trialUntil: event.target.value } }))} /></label>}
          <label>Overrides de entitlement (JSON)<textarea rows={4} value={form.entitlementsJson} onChange={event => setCommercialForms(rows => ({ ...rows, [tenant.id]: { ...form, entitlementsJson: event.target.value } }))} /></label>
          <label>Overrides de limite (JSON, null = sem limite)<textarea rows={4} value={form.limitsJson} onChange={event => setCommercialForms(rows => ({ ...rows, [tenant.id]: { ...form, limitsJson: event.target.value } }))} /></label>
          <label>Motivo<input required minLength={12} maxLength={400} value={form.reason} onChange={event => setCommercialForms(rows => ({ ...rows, [tenant.id]: { ...form, reason: event.target.value } }))} /><small>Sem dados clínicos ou segredos. Toda alteração registra antes/depois.</small></label>
          <div className="limit-summary"><b>Entitlements efetivos</b><span>{Object.entries(effective.features).filter(([, enabled]) => enabled).map(([key]) => key).join(' · ') || 'nenhum'}</span><span>Capacidade: {Object.entries(effective.limits).filter(([key]) => key !== 'storageBytes').map(([key, value]) => key + ': ' + (value === null ? 'sem limite' : value)).join(' · ')}</span><span>Storage: sem limite aplicado até existir medição de bytes confiável.</span></div>
          <button className="btn primary" type="button" onClick={() => void saveCommercialState(tenant)}>Salvar estado comercial</button>
        </div>}
      </details>;
    })}
    {tenants.map(tenant => <details className="card platform-branding" key={tenant.id}>
      <summary>Branding de {tenant.name}</summary>
      <div className="form-grid">
        {(['publicName','tagline','description','phone','email','address','logoUrl'] as const).map(field => <label key={field}>{field === 'publicName' ? 'Nome público' : field === 'tagline' ? 'Frase de apresentação' : field === 'description' ? 'Descrição pública' : field === 'phone' ? 'Telefone' : field === 'email' ? 'E-mail' : field === 'address' ? 'Endereço' : 'Logo (URL pública)'}{field === 'description' || field === 'address' ? <textarea maxLength={600} value={brandingForms[tenant.id]?.[field] ?? ''} onChange={event => setBrandingForms(current => ({ ...current, [tenant.id]: { ...defaultBranding(tenant), ...current[tenant.id], [field]: event.target.value } }))} /> : <input maxLength={field === 'logoUrl' ? 500 : 200} type={field === 'email' ? 'email' : 'text'} value={brandingForms[tenant.id]?.[field] ?? ''} onChange={event => setBrandingForms(current => ({ ...current, [tenant.id]: { ...defaultBranding(tenant), ...current[tenant.id], [field]: event.target.value } }))} />}</label>)}
        <label>Cor principal<input type="color" value={brandingForms[tenant.id]?.primaryColor ?? '#163d3a'} onChange={event => setBrandingForms(current => ({ ...current, [tenant.id]: { ...defaultBranding(tenant), ...current[tenant.id], primaryColor: event.target.value } }))} /></label>
        <label>Cor de destaque<input type="color" value={brandingForms[tenant.id]?.accentColor ?? '#72b9ad'} onChange={event => setBrandingForms(current => ({ ...current, [tenant.id]: { ...defaultBranding(tenant), ...current[tenant.id], accentColor: event.target.value } }))} /></label>
      </div>
      <button className="btn secondary" type="button" onClick={() => void saveBranding(tenant)}>Salvar branding</button>
    </details>)}
  </main>;
}
