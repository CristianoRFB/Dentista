import { FormEvent, useEffect, useState } from 'react';
import type { Membership, MembershipRole, Procedure, Professional } from '../../domain/types';
import { createTenantRecord, listTenantRecords, updateTenantRecord } from '../../lib/tenantData';
import { listTenantMemberships, saveTenantMembership } from '../../lib/membershipData';
import { useTenantAccess } from './TenantContext';
import { canCreateCommercialCapacity, getEffectiveEntitlements } from '../../commercial/entitlementService';

export function CatalogsPage() {
  const session = useTenantAccess();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [professionalName, setProfessionalName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [procedureName, setProcedureName] = useState('');
  const [duration, setDuration] = useState('30');
  const [memberUid, setMemberUid] = useState('');
  const [memberRole, setMemberRole] = useState<MembershipRole>('dentist');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const entitlements = session.status === 'ready' ? getEffectiveEntitlements(session.tenant) : null;
  const activeProfessionals = professionals.filter(person => person.status === 'active').length;
  const activeMembers = memberships.filter(member => member.status === 'active' && member.role !== 'tenant_owner').length;
  const canAddCapacity = session.status === 'ready' && canCreateCommercialCapacity(session.tenant);
  const professionalLimit = entitlements?.limits.professionals ?? null;
  const memberLimit = entitlements?.limits.adminUsers ?? null;

  async function refresh() {
    if (session.isDemo) {
      setProfessionals([]); setProcedures([]); setMemberships([]); return;
    }
    try {
      const [people, services, team] = await Promise.all([
        session.permissions.includes('professionals.read') ? listTenantRecords<Professional>(session, 'professionals') : Promise.resolve([]),
        session.permissions.includes('procedures.read') ? listTenantRecords<Procedure>(session, 'procedures') : Promise.resolve([]),
        session.permissions.includes('memberships.read') ? listTenantMemberships(session) : Promise.resolve([]),
      ]);
      setProfessionals(people); setProcedures(services); setMemberships(team); setError('');
    } catch {
      setError('Não foi possível carregar os cadastros.');
    }
  }
  useEffect(() => { void refresh(); }, [session]);

  async function addProfessional(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    try {
      await createTenantRecord(session, 'professionals', { displayName: professionalName.trim(), specialty: specialty.trim(), status: 'active' }, 'professionals.manage', 'professional.create', 'professional');
      setProfessionalName(''); setSpecialty(''); setMessage('Profissional cadastrado.'); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível cadastrar o profissional.'); }
  }

  async function addProcedure(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    try {
      await createTenantRecord(session, 'procedures', { name: procedureName.trim(), durationMinutes: Number(duration), active: true }, 'procedures.manage', 'procedure.create', 'procedure');
      setProcedureName(''); setDuration('30'); setMessage('Procedimento cadastrado.'); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível cadastrar o procedimento.'); }
  }

  async function deactivateProfessional(person: Professional) {
    try { await updateTenantRecord(session, 'professionals', person.id, { status: 'inactive' }, 'professionals.manage', 'professional.deactivate', 'professional'); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível inativar o profissional.'); }
  }

  async function deactivateProcedure(procedure: Procedure) {
    try { await updateTenantRecord(session, 'procedures', procedure.id, { active: false }, 'procedures.manage', 'procedure.deactivate', 'procedure'); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível inativar o procedimento.'); }
  }

  async function addMember(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    try {
      await saveTenantMembership(session, memberUid, memberRole, 'active');
      setMemberUid(''); setMessage('Membership atualizada e auditada.'); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a membership.'); }
  }

  async function changeMember(member: Membership, role: MembershipRole, status: 'active' | 'inactive') {
    setError(''); setMessage('');
    try {
      await saveTenantMembership(session, member.userId, role, status);
      setMessage('Membership atualizada e auditada.'); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a membership.'); }
  }

  return <>
    <div className="page-head"><div><span className="eyebrow">Configuração do tenant</span><h1>Profissionais e procedimentos</h1><p className="muted">Cadastros operacionais compartilhados pela equipe deste tenant.</p></div></div>
    {session.isDemo && <p className="demo-banner">Modo demonstrativo · cadastros reais só aparecem após conectar um tenant.</p>}
    {(error || message) && <p className={error ? 'form-error' : 'form-success'} role={error ? 'alert' : 'status'}>{error || message}</p>}
    <div className="grid cols-2">
      {session.permissions.includes('memberships.manage') && !session.isDemo && <section className="card team-management">
        <h2>Equipe e permissões</h2>
        <p className="muted">Adicione contas já cadastradas no Firebase Auth. Responsável da clínica não conta no limite. Ativos: {activeMembers}/{memberLimit ?? '—'}.</p>
        <form className="data-form" onSubmit={addMember}>
          <label>UID da conta<input required maxLength={128} value={memberUid} onChange={event => setMemberUid(event.target.value)} /></label>
          <label>Papel<select value={memberRole} onChange={event => setMemberRole(event.target.value as MembershipRole)}><option value="dentist">Dentista</option><option value="receptionist">Recepção</option><option value="assistant">Assistente</option><option value="tenant_admin">Administrador da clínica</option><option value="tenant_owner">Responsável da clínica</option></select></label>
          <button className="btn primary" type="submit" disabled={!canAddCapacity || activeMembers >= (memberLimit ?? 0) && !memberships.some(member => member.userId === memberUid.trim() && member.status === 'active' && member.role !== 'tenant_owner')}>Adicionar ou atualizar</button>
        </form>
        <ul className="managed-list">{memberships.map(member => <li key={member.userId}>
          <span><b>{member.userId}</b><small>{member.role} · {member.status}</small></span>
          {member.userId !== session.membership?.userId && <div className="row-actions">
            <select aria-label={'Papel de ' + member.userId} value={member.role} onChange={event => void changeMember(member, event.target.value as MembershipRole, member.status)}><option value="dentist">Dentista</option><option value="receptionist">Recepção</option><option value="assistant">Assistente</option><option value="tenant_admin">Administrador</option><option value="tenant_owner">Responsável</option></select>
            <button className="text-button" type="button" onClick={() => void changeMember(member, member.role, member.status === 'active' ? 'inactive' : 'active')}>{member.status === 'active' ? 'Inativar' : 'Reativar'}</button>
          </div>}
        </li>)}</ul>
      </section>}
      {session.permissions.includes('professionals.manage') && !session.isDemo && <section className="card">
        <h2>Profissionais</h2>
        <p className="muted">Ativos: {activeProfessionals}/{professionalLimit ?? '—'}.</p>
        <form className="data-form" onSubmit={addProfessional}>
          <label>Nome<input required maxLength={160} value={professionalName} onChange={event => setProfessionalName(event.target.value)} /></label>
          <label>Especialidade<input maxLength={120} value={specialty} onChange={event => setSpecialty(event.target.value)} /></label>
          <button className="btn primary" type="submit" disabled={!canAddCapacity || activeProfessionals >= (professionalLimit ?? 0)}>Adicionar profissional</button>
        </form>
        <ul className="managed-list">{professionals.map(person => <li key={person.id}><span><b>{person.displayName}</b><small>{person.specialty || 'Sem especialidade'} · {person.status}</small></span>{person.status === 'active' && <button className="text-button" type="button" onClick={() => void deactivateProfessional(person)}>Inativar</button>}</li>)}</ul>
      </section>}
      {session.permissions.includes('procedures.manage') && !session.isDemo && <section className="card">
        <h2>Procedimentos</h2>
        <form className="data-form" onSubmit={addProcedure}>
          <label>Nome<input required maxLength={120} value={procedureName} onChange={event => setProcedureName(event.target.value)} /></label>
          <label>Duração padrão (minutos)<input required min="5" max="480" step="5" type="number" value={duration} onChange={event => setDuration(event.target.value)} /></label>
          <button className="btn primary" type="submit">Adicionar procedimento</button>
        </form>
        <ul className="managed-list">{procedures.map(procedure => <li key={procedure.id}><span><b>{procedure.name}</b><small>{procedure.durationMinutes} min · {procedure.active ? 'ativo' : 'inativo'}</small></span>{procedure.active && <button className="text-button" type="button" onClick={() => void deactivateProcedure(procedure)}>Inativar</button>}</li>)}</ul>
      </section>}
      {!session.permissions.includes('professionals.manage') && !session.permissions.includes('procedures.manage') && <section className="card"><p>Você pode consultar estes cadastros durante a operação, mas não alterá-los.</p><p>{professionals.length} profissionais · {procedures.length} procedimentos</p></section>}
    </div>
  </>;
}
