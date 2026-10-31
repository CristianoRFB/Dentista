import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import {
  assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection, deleteDoc, doc, getDoc, getDocs, query, where, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { permissionTemplates } from '../src/domain/permissions';
import { createTenantRecordInDb, updateTenantRecordInDb } from '../src/lib/tenantDataCore';
import type { TenantAccessState } from '../src/modules/tenant/tenantResolver';
import { findScheduleConflict, scheduleLockIds, type AppointmentWindow, type Reservation } from '../workers/media-api/src/scheduling';

const projectId = 'demo-odontoflow';
let env: RulesTestEnvironment;

const tenant = (id: string, status = 'active') => ({
  id, name: 'Clínica de teste ' + id, slug: 'clinica-' + id.toLowerCase(), status,
      features: {}, limits: {}, lastAuditLogId: 'seed', planId: 'essential',
      subscriptionStatus: status === 'active' ? 'active' : 'suspended', trialUntil: null,
      entitlementOverrides: {}, limitOverrides: {},
});

async function seed() {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'tenants/A'), tenant('A')),
      setDoc(doc(db, 'tenants/B'), tenant('B')),
      setDoc(doc(db, 'tenants/S'), tenant('S', 'suspended')),
      setDoc(doc(db, 'tenantSlugs/clinica-a'), { tenantId: 'A', slug: 'clinica-a', status: 'active' }),
      setDoc(doc(db, 'tenantSlugs/clinica-b'), { tenantId: 'B', slug: 'clinica-b', status: 'active' }),
      setDoc(doc(db, 'tenants/A/memberships/dentist-a'), { userId: 'dentist-a', tenantId: 'A', role: 'dentist', status: 'active', permissions: [...permissionTemplates.dentist] }),
      setDoc(doc(db, 'tenants/A/memberships/tenant-owner-a'), { userId: 'tenant-owner-a', tenantId: 'A', role: 'tenant_owner', status: 'active', permissions: [...permissionTemplates.tenant_owner] }),
      setDoc(doc(db, 'tenants/B/memberships/dentist-b'), { userId: 'dentist-b', tenantId: 'B', role: 'dentist', status: 'active', permissions: [...permissionTemplates.dentist] }),
      setDoc(doc(db, 'tenants/A/memberships/reception-a'), { userId: 'reception-a', tenantId: 'A', role: 'receptionist', status: 'active', permissions: [...permissionTemplates.receptionist] }),
      setDoc(doc(db, 'tenants/A/memberships/assistant-a'), { userId: 'assistant-a', tenantId: 'A', role: 'assistant', status: 'active', permissions: [...permissionTemplates.assistant] }),
      setDoc(doc(db, 'tenants/A/memberships/inactive-a'), { userId: 'inactive-a', tenantId: 'A', role: 'dentist', status: 'inactive', permissions: [...permissionTemplates.dentist] }),
      setDoc(doc(db, 'tenants/S/memberships/dentist-s'), { userId: 'dentist-s', tenantId: 'S', role: 'dentist', status: 'active', permissions: [...permissionTemplates.dentist] }),
      setDoc(doc(db, 'platformOwners/platform-owner'), { status: 'active' }),
      setDoc(doc(db, 'platformOwners/platform-owner-pending'), { status: 'pending' }),
      setDoc(doc(db, 'platformOwners/platform-owner-missing-status'), { createdAt: serverTimestamp() }),
      setDoc(doc(db, 'tenants/A/patients/patient-a'), { id: 'patient-a', tenantId: 'A', name: 'Paciente Fictício A', searchName: 'paciente ficticio a', status: 'active' }),
      setDoc(doc(db, 'tenants/B/patients/patient-b'), { id: 'patient-b', tenantId: 'B', name: 'Paciente Fictício B', searchName: 'paciente ficticio b', status: 'active' }),
      setDoc(doc(db, 'tenants/A/professionals/prof-a'), { id: 'prof-a', tenantId: 'A', displayName: 'Dentista A', status: 'active' }),
      setDoc(doc(db, 'tenants/B/professionals/prof-b'), { id: 'prof-b', tenantId: 'B', displayName: 'Dentista B', status: 'active' }),
      setDoc(doc(db, 'tenants/A/professionals/prof-b'), { id: 'prof-b', tenantId: 'A', displayName: 'Dentista A2', status: 'active' }),
      setDoc(doc(db, 'tenants/A/procedures/proc-a'), { id: 'proc-a', tenantId: 'A', name: 'Consulta fictícia A', active: true }),
      setDoc(doc(db, 'tenants/B/procedures/proc-b'), { id: 'proc-b', tenantId: 'B', name: 'Consulta fictícia B', active: true }),
      setDoc(doc(db, 'tenants/A/scheduleResources/chair-a'), { id: 'chair-a', tenantId: 'A', name: 'Cadeira A', active: true }),
      setDoc(doc(db, 'tenants/B/scheduleResources/chair-b'), { id: 'chair-b', tenantId: 'B', name: 'Cadeira B', active: true }),
      setDoc(doc(db, 'tenants/A/scheduleResources/chair-b'), { id: 'chair-b', tenantId: 'A', name: 'Cadeira A2', active: true }),
      setDoc(doc(db, 'tenants/A/patients/patient-a/clinicalRecords/record-seed-a'), { id: 'record-seed-a', tenantId: 'A', patientId: 'patient-a', createdBy: 'dentist-a', content: 'Registro fictício A' }),
      setDoc(doc(db, 'tenants/B/patients/patient-b/clinicalRecords/record-seed-b'), { id: 'record-seed-b', tenantId: 'B', patientId: 'patient-b', createdBy: 'dentist-b', content: 'Registro fictício B' }),
      setDoc(doc(db, 'tenants/A/appointments/appt-a'), { id: 'appt-a', tenantId: 'A', patientId: 'patient-a', professionalId: 'prof-a', startsAt: '2026-10-08T09:00:00.000Z', endsAt: '2026-10-08T10:00:00.000Z', status: 'confirmed' }),
      setDoc(doc(db, 'tenants/B/appointments/appt-b'), { id: 'appt-b', tenantId: 'B', patientId: 'patient-b', professionalId: 'prof-b', startsAt: '2026-10-08T09:00:00.000Z', endsAt: '2026-10-08T10:00:00.000Z', status: 'confirmed' }),
      setDoc(doc(db, 'tenants/A/appointments/appt-resource-conflict'), { id: 'appt-resource-conflict', tenantId: 'A', patientId: 'patient-a', professionalId: 'prof-b', resourceId: 'chair-a', startsAt: '2026-10-08T13:00:00.000Z', endsAt: '2026-10-08T14:00:00.000Z', status: 'confirmed' }),
      setDoc(doc(db, 'tenants/A/publicProfile/public'), { tenantId: 'A', publicName: 'Marca A', tagline: '', description: '', phone: '', email: '', address: '', primaryColor: '#163d3a', accentColor: '#72b9ad', logoUrl: '' }),
      setDoc(doc(db, 'tenants/B/publicProfile/public'), { tenantId: 'B', publicName: 'Marca B', tagline: '', description: '', phone: '', email: '', address: '', primaryColor: '#163d3a', accentColor: '#72b9ad', logoUrl: '' }),
      setDoc(doc(db, 'tenants/A/patients/patient-a/clinicalPhotos/photo-a'), { id: 'photo-a', tenantId: 'A', patientId: 'patient-a', objectKey: 'tenants/A/patients/patient-a/photo-a.webp', contentType: 'image/webp' }),
      setDoc(doc(db, 'tenants/B/patients/patient-b/clinicalPhotos/photo-b'), { id: 'photo-b', tenantId: 'B', patientId: 'patient-b', objectKey: 'tenants/B/patients/patient-b/photo-b.webp', contentType: 'image/webp' }),
    ]);
  });
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
  await seed();
});

afterAll(async () => {
  await env?.cleanup();
});

describe('Firestore Rules — isolamento e autorização', () => {
  it('separa pacientes, profissionais e agenda de Tenant A e Tenant B', async () => {
    const a = env.authenticatedContext('dentist-a').firestore();
    await assertSucceeds(getDoc(doc(a, 'tenants/A/patients/patient-a')));
    await assertSucceeds(getDoc(doc(a, 'tenants/A/professionals/prof-a')));
    await assertSucceeds(getDoc(doc(a, 'tenants/A/appointments/appt-a')));
    await assertFails(getDoc(doc(a, 'tenants/B/patients/patient-b')));
    await assertFails(getDoc(doc(a, 'tenants/B/professionals/prof-b')));
    await assertFails(getDoc(doc(a, 'tenants/B/appointments/appt-b')));
  });

  it('separa procedimentos, recursos e registros/mídia clínica entre Tenant A e Tenant B', async () => {
    const a = env.authenticatedContext('dentist-a').firestore();
    await assertSucceeds(getDoc(doc(a, 'tenants/A/procedures/proc-a')));
    await assertSucceeds(getDoc(doc(a, 'tenants/A/scheduleResources/chair-a')));
    await assertSucceeds(getDoc(doc(a, 'tenants/A/patients/patient-a/clinicalRecords/record-seed-a')));
    await assertSucceeds(getDoc(doc(a, 'tenants/A/patients/patient-a/clinicalPhotos/photo-a')));
    await assertFails(getDoc(doc(a, 'tenants/B/procedures/proc-b')));
    await assertFails(getDoc(doc(a, 'tenants/B/scheduleResources/chair-b')));
    await assertFails(getDoc(doc(a, 'tenants/B/patients/patient-b/clinicalRecords/record-seed-b')));
    await assertFails(getDoc(doc(a, 'tenants/B/patients/patient-b/clinicalPhotos/photo-b')));
  });

  it('exige membership ativa e tenant ativo', async () => {
    const inactive = env.authenticatedContext('inactive-a').firestore();
    const suspended = env.authenticatedContext('dentist-s').firestore();
    await assertFails(getDoc(doc(inactive, 'tenants/A/patients/patient-a')));
    await assertFails(getDoc(doc(suspended, 'tenants/S/patients/patient-a')));
    await assertSucceeds(getDoc(doc(inactive, 'tenants/A/memberships/inactive-a')));
  });

  it('impede contradição entre tenantId do documento e tenant do caminho', async () => {
    const a = env.authenticatedContext('dentist-a').firestore();
    await assertFails(setDoc(doc(a, 'tenants/A/patients/forged'), {
      tenantId: 'B', name: 'Paciente indevido', searchName: 'paciente indevido', status: 'active',
      createdBy: 'dentist-a', lastAuditLogId: 'fake',
    }));
  });

  it('persiste dados tenant-scoped e mantém profissionais/recursos protegidos contra writes diretos', async () => {
    const db = env.authenticatedContext('tenant-owner-a').firestore();
    const session: Extract<TenantAccessState, { status: 'ready' }> = {
      status: 'ready', tenant: tenant('A'),
      membership: {
        userId: 'tenant-owner-a', tenantId: 'A', role: 'tenant_owner', status: 'active',
        permissions: [...permissionTemplates.tenant_owner],
      },
      permissions: [...permissionTemplates.tenant_owner], isPlatformOwner: false, isDemo: false, error: null,
    };
    const patientId = await createTenantRecordInDb(db, session, 'patients', {
      name: 'Paciente de teste', searchName: 'paciente de teste', status: 'active',
    }, 'patients.manage', 'patient.create', 'patient');
    const professionalId = 'prof-a';
    const procedureId = await createTenantRecordInDb(db, session, 'procedures', {
      name: 'Consulta de teste', durationMinutes: 30, active: true,
    }, 'procedures.manage', 'procedure.create', 'procedure');
    const resourceId = 'chair-a';

    expect((await assertSucceeds(getDoc(doc(db, 'tenants/A/patients', patientId)))).data()?.tenantId).toBe('A');
    expect((await assertSucceeds(getDoc(doc(db, 'tenants/A/professionals', professionalId)))).data()?.displayName).toBe('Dentista A');
    expect((await assertSucceeds(getDoc(doc(db, 'tenants/A/procedures', procedureId)))).data()?.active).toBe(true);
    expect((await assertSucceeds(getDoc(doc(db, 'tenants/A/scheduleResources', resourceId)))).data()?.active).toBe(true);

    await updateTenantRecordInDb(db, session, 'patients', patientId, { status: 'inactive' }, 'patients.manage', 'patient.deactivate', 'patient');
    await assertFails(updateTenantRecordInDb(db, session, 'professionals', professionalId, { status: 'inactive' }, 'professionals.manage', 'professional.deactivate', 'professional'));
    await updateTenantRecordInDb(db, session, 'procedures', procedureId, { active: false }, 'procedures.manage', 'procedure.deactivate', 'procedure');
    await assertFails(updateTenantRecordInDb(db, session, 'scheduleResources', resourceId, { active: false }, 'resources.manage', 'resource.deactivate', 'scheduleResource'));

    expect((await assertSucceeds(getDoc(doc(db, 'tenants/A/patients', patientId)))).data()?.status).toBe('inactive');
    expect((await assertSucceeds(getDoc(doc(db, 'tenants/A/professionals', professionalId)))).data()?.status).toBe('active');
    expect((await assertSucceeds(getDoc(doc(db, 'tenants/A/procedures', procedureId)))).data()?.active).toBe(false);
    expect((await assertSucceeds(getDoc(doc(db, 'tenants/A/scheduleResources', resourceId)))).data()?.active).toBe(true);
    const otherTenant = env.authenticatedContext('dentist-b').firestore();
    await assertFails(getDoc(doc(otherTenant, 'tenants/A/patients', patientId)));
  });

  it('mantém receptionist sem clinical.write e não permite gravar prontuário', async () => {
    const reception = env.authenticatedContext('reception-a').firestore();
    await assertFails(getDoc(doc(reception, 'tenants/A/patients/patient-a/clinicalRecords/record-a')));
    await assertFails(setDoc(doc(reception, 'tenants/A/patients/patient-a/clinicalRecords/record-a'), {
      tenantId: 'A', patientId: 'patient-a', dentistId: 'prof-a', recordType: 'note',
      content: 'Não autorizado', createdBy: 'reception-a', createdAt: serverTimestamp(), auditLogId: 'fake',
    }));
  });

  it('mantém assistant no menor privilégio definido para o domínio', async () => {
    const assistant = env.authenticatedContext('assistant-a').firestore();
    await assertSucceeds(getDoc(doc(assistant, 'tenants/A/patients/patient-a')));
    await assertSucceeds(getDoc(doc(assistant, 'tenants/A/appointments/appt-a')));
    await assertFails(getDoc(doc(assistant, 'tenants/A/patients/patient-a/clinicalRecords/record-seed-a')));
    await assertFails(setDoc(doc(assistant, 'tenants/A/scheduleResources/chair-new'), {
      id: 'chair-new', tenantId: 'A', name: 'Recurso não autorizado', active: true,
    }));
  });

  it('permite ao dentista acrescentar registro e adendo auditáveis, mas não alterar o original', async () => {
    const db = env.authenticatedContext('dentist-a').firestore();
    const record = doc(db, 'tenants/A/patients/patient-a/clinicalRecords/record-a');
    const recordAudit = doc(db, 'tenants/A/auditLogs/audit-record-a');
    const batch = writeBatch(db);
    batch.set(record, {
      tenantId: 'A', patientId: 'patient-a', dentistId: 'prof-a', recordType: 'evolution',
      content: 'Evolução fictícia', createdBy: 'dentist-a', createdAt: serverTimestamp(), auditLogId: recordAudit.id,
    });
    batch.set(recordAudit, {
      tenantId: 'A', actorId: 'dentist-a', actorRole: 'dentist', action: 'clinical_record.create',
      resourceType: 'clinicalRecord', resourceId: record.id, patientId: 'patient-a', timestamp: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
    await assertFails(setDoc(record, { content: 'Sobrescrito' }, { merge: true }));
    await assertFails(deleteDoc(record));

    const amendment = doc(db, 'tenants/A/patients/patient-a/clinicalRecordAmendments/amend-a');
    const amendmentAudit = doc(db, 'tenants/A/auditLogs/audit-amend-a');
    const amendmentBatch = writeBatch(db);
    amendmentBatch.set(amendment, {
      tenantId: 'A', patientId: 'patient-a', recordId: record.id, reason: 'Correção de contexto',
      content: 'Adendo fictício', createdBy: 'dentist-a', createdAt: serverTimestamp(), auditLogId: amendmentAudit.id,
    });
    amendmentBatch.set(amendmentAudit, {
      tenantId: 'A', actorId: 'dentist-a', actorRole: 'dentist', action: 'clinical_amendment.create',
      resourceType: 'clinicalAmendment', resourceId: amendment.id, patientId: 'patient-a', timestamp: serverTimestamp(),
    });
    await assertSucceeds(amendmentBatch.commit());
  });

  it('nega registro ou adendo clínico sem paciente existente e ligado ao tenant', async () => {
    const db = env.authenticatedContext('dentist-a').firestore();
    const orphanPatientId = 'patient-missing';
    const orphanRecord = doc(db, 'tenants/A/patients', orphanPatientId, 'clinicalRecords', 'record-orphan');
    const orphanAudit = doc(db, 'tenants/A/auditLogs/audit-orphan');
    const orphanBatch = writeBatch(db);
    orphanBatch.set(orphanRecord, {
      tenantId: 'A', patientId: orphanPatientId, dentistId: 'prof-a', recordType: 'note',
      content: 'Não pode existir sem paciente', createdBy: 'dentist-a', createdAt: serverTimestamp(), auditLogId: orphanAudit.id,
    });
    orphanBatch.set(orphanAudit, {
      tenantId: 'A', actorId: 'dentist-a', actorRole: 'dentist', action: 'clinical_record.create',
      resourceType: 'clinicalRecord', resourceId: orphanRecord.id, patientId: orphanPatientId, timestamp: serverTimestamp(),
    });
    await assertFails(orphanBatch.commit());

    await env.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'tenants/A/patients/patient-shadow'), {
      id: 'patient-shadow', tenantId: 'B', name: 'Paciente em caminho inconsistente', status: 'active',
    }));
    const shadowRecord = doc(db, 'tenants/A/patients/patient-shadow/clinicalRecords/record-shadow');
    const shadowAudit = doc(db, 'tenants/A/auditLogs/audit-shadow');
    const shadowBatch = writeBatch(db);
    shadowBatch.set(shadowRecord, {
      tenantId: 'A', patientId: 'patient-shadow', dentistId: 'prof-a', recordType: 'note',
      content: 'Tenant do paciente contradiz o caminho', createdBy: 'dentist-a', createdAt: serverTimestamp(), auditLogId: shadowAudit.id,
    });
    shadowBatch.set(shadowAudit, {
      tenantId: 'A', actorId: 'dentist-a', actorRole: 'dentist', action: 'clinical_record.create',
      resourceType: 'clinicalRecord', resourceId: shadowRecord.id, patientId: 'patient-shadow', timestamp: serverTimestamp(),
    });
    await assertFails(shadowBatch.commit());

    await env.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'tenants/A/patients/patient-orphan/clinicalRecords/orphan-record'), {
      tenantId: 'A', patientId: 'patient-orphan', createdBy: 'dentist-a', content: 'Registro legado órfão',
    }));
    const amendment = doc(db, 'tenants/A/patients/patient-orphan/clinicalRecordAmendments/amend-orphan');
    const amendmentAudit = doc(db, 'tenants/A/auditLogs/audit-amend-orphan');
    const amendmentBatch = writeBatch(db);
    amendmentBatch.set(amendment, {
      tenantId: 'A', patientId: 'patient-orphan', recordId: 'orphan-record', reason: 'Corrigir registro',
      content: 'Adendo não deve criar outra subcoleção órfã', createdBy: 'dentist-a', createdAt: serverTimestamp(), auditLogId: amendmentAudit.id,
    });
    amendmentBatch.set(amendmentAudit, {
      tenantId: 'A', actorId: 'dentist-a', actorRole: 'dentist', action: 'clinical_amendment.create',
      resourceType: 'clinicalAmendment', resourceId: amendment.id, patientId: 'patient-orphan', timestamp: serverTimestamp(),
    });
    await assertFails(amendmentBatch.commit());
  });

  it('nega logs forjados sem a mutação correspondente', async () => {
    const db = env.authenticatedContext('dentist-a').firestore();
    await assertFails(setDoc(doc(db, 'tenants/A/auditLogs/forged'), {
      tenantId: 'A', actorId: 'dentist-a', actorRole: 'dentist',
      action: 'patient.create', resourceType: 'patient', resourceId: 'missing',
      timestamp: serverTimestamp(),
    }));
  });

  it('nega writes diretos de agendamento e mídia clínica', async () => {
    const db = env.authenticatedContext('dentist-a').firestore();
    await assertFails(setDoc(doc(db, 'tenants/A/appointments/direct'), {
      tenantId: 'A', patientId: 'patient-a', professionalId: 'prof-a', startsAt: '2026-10-08T11:00:00.000Z',
      endsAt: '2026-10-08T12:00:00.000Z', status: 'confirmed',
    }));
    await assertFails(setDoc(doc(db, 'tenants/A/patients/patient-a/clinicalPhotos/forged'), {
      tenantId: 'A', patientId: 'patient-a', objectKey: 'tenants/A/patients/patient-a/forged',
    }));
    await assertFails(deleteDoc(doc(db, 'tenants/A/patients/patient-a')));
  });

  it('mantém o Platform Owner fora do clínico até abrir suporte temporário', async () => {
    const owner = env.authenticatedContext('platform-owner').firestore();
    await assertSucceeds(getDocs(collection(owner, 'tenants')));
    await assertFails(getDoc(doc(owner, 'tenants/A/patients/patient-a')));
    await env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'platformSupportAccess/A'), {
        tenantId: 'A', actorId: 'platform-owner', reason: 'Investigação de incidente solicitado',
        expiresAt: Timestamp.fromMillis(Date.now() + 60 * 60_000), revokedAt: null,
      });
    });
    await assertSucceeds(getDoc(doc(owner, 'tenants/A/patients/patient-a')));

    const invalidSupportEntries = [
      { tenantId: 'A', actorId: 'different-owner', reason: 'Investigação solicitada com motivo', expiresAt: Timestamp.fromMillis(Date.now() + 60 * 60_000), revokedAt: null },
      { tenantId: 'A', actorId: 'platform-owner', reason: 'curto', expiresAt: Timestamp.fromMillis(Date.now() + 60 * 60_000), revokedAt: null },
      { tenantId: 'A', actorId: 'platform-owner', reason: 'Investigação solicitada com motivo', expiresAt: Timestamp.fromMillis(Date.now() - 1000), revokedAt: null },
      { tenantId: 'A', actorId: 'platform-owner', reason: 'Investigação solicitada com motivo', expiresAt: Timestamp.fromMillis(Date.now() + 60 * 60_000), revokedAt: Timestamp.now() },
    ];
    for (const support of invalidSupportEntries) {
      await env.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'platformSupportAccess/A'), support));
      await assertFails(getDoc(doc(owner, 'tenants/A/patients/patient-a')));
    }
  });

  it('reconhece Platform Owner somente com status explicitamente active', async () => {
    for (const uid of ['platform-owner-pending', 'platform-owner-missing-status']) {
      const user = env.authenticatedContext(uid).firestore();
      await assertFails(getDocs(collection(user, 'tenants')));
      await assertFails(getDoc(doc(user, 'tenants/A/patients/patient-a')));
    }
  });

  it('permite ao Platform Owner provisionar tenant, slug, owner e branding com auditoria', async () => {
    const db = env.authenticatedContext('platform-owner').firestore();
    const tenantId = 'tenant-c';
    const ownerUid = 'tenant-owner-c';
    const tenantRef = doc(db, 'tenants', tenantId);
    const slugRef = doc(db, 'tenantSlugs', 'clinica-c');
    const membershipRef = doc(db, 'tenants', tenantId, 'memberships', ownerUid);
    const profileRef = doc(db, 'tenants', tenantId, 'publicProfile', 'public');
    const tenantAuditId = 'tenant-create-audit';
    const membershipAuditId = 'membership-create-audit';
    const profileAuditId = 'profile-create-audit';

    await assertSucceeds(runTransaction(db, async transaction => {
      const existingSlug = await transaction.get(slugRef);
      if (existingSlug.exists()) throw new Error('slug já existe');
      transaction.set(tenantRef, {
        id: tenantId, name: 'Clínica C', slug: 'clinica-c', status: 'active', features: {}, limits: {},
        planId: 'essential', subscriptionStatus: 'active', trialUntil: null, entitlementOverrides: {}, limitOverrides: {},
        branding: { publicName: 'Clínica C', primaryColor: '#163d3a', accentColor: '#72b9ad' },
        lastAuditLogId: tenantAuditId, createdBy: 'platform-owner', createdAt: serverTimestamp(),
      });
      transaction.set(slugRef, {
        tenantId, slug: 'clinica-c', status: 'active', auditLogId: tenantAuditId, createdAt: serverTimestamp(),
      });
      transaction.set(membershipRef, {
        userId: ownerUid, tenantId, role: 'tenant_owner', status: 'active',
        permissions: [...permissionTemplates.tenant_owner], lastAuditLogId: membershipAuditId,
        createdBy: 'platform-owner', createdAt: serverTimestamp(),
      });
      transaction.set(profileRef, {
        tenantId, publicName: 'Clínica C', tagline: '', description: '', phone: '', email: '', address: '',
        primaryColor: '#163d3a', accentColor: '#72b9ad', logoUrl: '', lastAuditLogId: profileAuditId,
        updatedAt: serverTimestamp(),
      });
      transaction.set(doc(db, 'tenants', tenantId, 'auditLogs', tenantAuditId), {
        tenantId, actorId: 'platform-owner', actorRole: 'platform_owner', action: 'tenant.create',
        resourceType: 'tenant', resourceId: tenantId, timestamp: serverTimestamp(), reason: 'Provisionamento inicial da clínica',
        before: { planId: null, subscriptionStatus: null, trialUntil: null, entitlementOverrides: {}, limitOverrides: {} },
        after: { planId: 'essential', subscriptionStatus: 'active', trialUntil: null, entitlementOverrides: {}, limitOverrides: {} },
      });
      transaction.set(doc(db, 'tenants', tenantId, 'auditLogs', membershipAuditId), {
        tenantId, actorId: 'platform-owner', actorRole: 'platform_owner', action: 'membership.create',
        resourceType: 'membership', resourceId: ownerUid, timestamp: serverTimestamp(),
      });
      transaction.set(doc(db, 'tenants', tenantId, 'auditLogs', profileAuditId), {
        tenantId, actorId: 'platform-owner', actorRole: 'platform_owner', action: 'publicProfile.create',
        resourceType: 'publicProfile', resourceId: 'public', timestamp: serverTimestamp(),
      });
    }));

    expect((await assertSucceeds(getDoc(tenantRef))).data()?.status).toBe('active');
    expect((await assertSucceeds(getDoc(membershipRef))).data()?.role).toBe('tenant_owner');
    expect((await assertSucceeds(getDoc(profileRef))).data()?.publicName).toBe('Clínica C');
    expect((await assertSucceeds(getDoc(slugRef))).data()?.status).toBe('active');

    const commercialAuditId = 'tenant-commercial-audit';
    await assertSucceeds(runTransaction(db, async transaction => {
      const current = await transaction.get(tenantRef);
      if (!current.exists()) throw new Error('tenant não existe');
      const data = current.data();
      const before = {
        planId: data.planId, subscriptionStatus: data.subscriptionStatus, trialUntil: data.trialUntil,
        entitlementOverrides: data.entitlementOverrides, limitOverrides: data.limitOverrides,
      };
      const after = {
        planId: 'pro', subscriptionStatus: 'active', trialUntil: null,
        entitlementOverrides: {}, limitOverrides: { professionals: 4 },
      };
      transaction.update(tenantRef, { ...after, lastAuditLogId: commercialAuditId, updatedAt: serverTimestamp() });
      transaction.set(doc(db, 'tenants', tenantId, 'auditLogs', commercialAuditId), {
        tenantId, actorId: 'platform-owner', actorRole: 'platform_owner', action: 'tenant.commercial.update',
        resourceType: 'tenant', resourceId: tenantId, timestamp: serverTimestamp(),
        reason: 'Condição comercial autorizada pelo operador', before, after,
      });
    }));
    expect((await assertSucceeds(getDoc(tenantRef))).data()).toMatchObject({ planId: 'pro', limitOverrides: { professionals: 4 } });

    const tenantBrandAuditId = 'tenant-branding-audit';
    const profileBrandAuditId = 'profile-branding-audit';
    await assertSucceeds(runTransaction(db, async transaction => {
      const current = await transaction.get(tenantRef);
      if (!current.exists()) throw new Error('tenant não existe');
      transaction.set(tenantRef, {
        ...current.data(),
        branding: { publicName: 'Clínica C Atualizada', primaryColor: '#224466', accentColor: '#aabbcc' },
        lastAuditLogId: tenantBrandAuditId, updatedAt: serverTimestamp(),
      });
      transaction.set(profileRef, {
        tenantId, publicName: 'Clínica C Atualizada', tagline: '', description: '', phone: '', email: '', address: '',
        primaryColor: '#224466', accentColor: '#aabbcc', logoUrl: '', lastAuditLogId: profileBrandAuditId,
        updatedAt: serverTimestamp(),
      });
      transaction.set(doc(db, 'tenants', tenantId, 'auditLogs', tenantBrandAuditId), {
        tenantId, actorId: 'platform-owner', actorRole: 'platform_owner', action: 'tenant.branding.update',
        resourceType: 'tenant', resourceId: tenantId, timestamp: serverTimestamp(),
      });
      transaction.set(doc(db, 'tenants', tenantId, 'auditLogs', profileBrandAuditId), {
        tenantId, actorId: 'platform-owner', actorRole: 'platform_owner', action: 'publicProfile.update',
        resourceType: 'publicProfile', resourceId: 'public', timestamp: serverTimestamp(),
      });
    }));

    const suspendAuditId = 'tenant-suspend-audit';
    await assertSucceeds(runTransaction(db, async transaction => {
      const [currentTenant, currentSlug] = await Promise.all([transaction.get(tenantRef), transaction.get(slugRef)]);
      if (!currentTenant.exists() || !currentSlug.exists()) throw new Error('tenant/slug não existe');
      transaction.update(tenantRef, { status: 'suspended', lastAuditLogId: suspendAuditId, updatedAt: serverTimestamp() });
      transaction.update(slugRef, { status: 'suspended', auditLogId: suspendAuditId, updatedAt: serverTimestamp() });
      transaction.set(doc(db, 'tenants', tenantId, 'auditLogs', suspendAuditId), {
        tenantId, actorId: 'platform-owner', actorRole: 'platform_owner', action: 'tenant.suspend',
        resourceType: 'tenant', resourceId: tenantId, timestamp: serverTimestamp(),
      });
    }));
    expect((await assertSucceeds(getDoc(tenantRef))).data()?.status).toBe('suspended');
    expect((await assertSucceeds(getDoc(slugRef))).data()?.status).toBe('suspended');
    await assertFails(getDoc(profileRef));
  });

  it('exige auditoria para conceder e revogar suporte clínico temporário', async () => {
    const db = env.authenticatedContext('platform-owner').firestore();
    const supportRef = doc(db, 'platformSupportAccess', 'A');
    const grantAuditId = 'support-grant-audit';
    await assertSucceeds(runTransaction(db, async transaction => {
      const current = await transaction.get(supportRef);
      if (current.exists()) throw new Error('suporte já existe');
      transaction.set(supportRef, {
        tenantId: 'A', actorId: 'platform-owner', reason: 'Investigar chamado clínico urgente',
        expiresAt: Timestamp.fromMillis(Date.now() + 60 * 60_000), auditLogId: grantAuditId,
        createdAt: serverTimestamp(), revokedAt: null,
      });
      transaction.set(doc(db, 'tenants/A/auditLogs', grantAuditId), {
        tenantId: 'A', actorId: 'platform-owner', actorRole: 'platform_owner', action: 'support_access.grant',
        resourceType: 'supportAccess', resourceId: 'A', timestamp: serverTimestamp(),
      });
    }));
    await assertSucceeds(getDoc(doc(db, 'tenants/A/patients/patient-a')));

    const revokeAuditId = 'support-revoke-audit';
    await assertSucceeds(runTransaction(db, async transaction => {
      const current = await transaction.get(supportRef);
      if (!current.exists()) throw new Error('suporte não existe');
      transaction.update(supportRef, { revokedAt: serverTimestamp(), auditLogId: revokeAuditId });
      transaction.set(doc(db, 'tenants/A/auditLogs', revokeAuditId), {
        tenantId: 'A', actorId: 'platform-owner', actorRole: 'platform_owner', action: 'support_access.revoke',
        resourceType: 'supportAccess', resourceId: 'A', timestamp: serverTimestamp(),
      });
    }));
    await assertFails(getDoc(doc(db, 'tenants/A/patients/patient-a')));
  });

  it('impede owner de alterar estado comercial e valida auditoria, motivo e tipos de override', async () => {
    const ownerDb = env.authenticatedContext('tenant-owner-a').firestore();
    await assertFails(updateDoc(doc(ownerDb, 'tenants/A'), {
      planId: 'premium', subscriptionStatus: 'active', trialUntil: null,
      entitlementOverrides: {}, limitOverrides: { professionals: 10 }, lastAuditLogId: 'owner-forge',
    }));

    const platformDb = env.authenticatedContext('platform-owner').firestore();
    const tenantRef = doc(platformDb, 'tenants/A');
    const tryCommercialUpdate = (auditId: string, after: Record<string, unknown>, reason: string) => runTransaction(platformDb, async transaction => {
      const current = await transaction.get(tenantRef);
      if (!current.exists()) throw new Error('tenant não existe');
      const beforeData = current.data();
      const before = {
        planId: beforeData.planId, subscriptionStatus: beforeData.subscriptionStatus,
        trialUntil: beforeData.trialUntil, entitlementOverrides: beforeData.entitlementOverrides,
        limitOverrides: beforeData.limitOverrides,
      };
      transaction.update(tenantRef, { ...after, lastAuditLogId: auditId, updatedAt: serverTimestamp() });
      transaction.set(doc(platformDb, 'tenants/A/auditLogs', auditId), {
        tenantId: 'A', actorId: 'platform-owner', actorRole: 'platform_owner', action: 'tenant.commercial.update',
        resourceType: 'tenant', resourceId: 'A', timestamp: serverTimestamp(), reason, before, after,
      });
    });

    await assertFails(tryCommercialUpdate('short-reason-audit', {
      planId: 'pro', subscriptionStatus: 'active', trialUntil: null,
      entitlementOverrides: {}, limitOverrides: {},
    }, 'curto'));
    await assertFails(tryCommercialUpdate('invalid-override-audit', {
      planId: 'pro', subscriptionStatus: 'active', trialUntil: null,
      entitlementOverrides: { agenda: 'true' }, limitOverrides: {},
    }, 'Ajuste comercial com tipos inválidos'));
    await assertFails(tryCommercialUpdate('invalid-limit-audit', {
      planId: 'pro', subscriptionStatus: 'active', trialUntil: null,
      entitlementOverrides: {}, limitOverrides: { professionals: -1 },
    }, 'Ajuste comercial com limite inválido'));
    expect((await assertSucceeds(getDoc(doc(platformDb, 'tenants/A')))).data()?.planId).toBe('essential');
  });


  it('D2: exige criação em lote, trilha de versões imutável e nega acesso A×B', async () => {
    const dentist = env.authenticatedContext('dentist-a').firestore();
    const other = env.authenticatedContext('dentist-b').firestore();
    const receptionist = env.authenticatedContext('reception-a').firestore();
    const root = doc(dentist,'tenants/A/treatmentPlans/plan-a');
    const v1 = doc(dentist,'tenants/A/treatmentPlans/plan-a/versions/version-a1');
    const log = doc(dentist,'tenants/A/auditLogs/plan-a-audit-1');
    const item = {procedureId:'proc-a',description:'Consulta clínica',toothId:'16',stage:'planned',quantity:1,unitPriceCents:0};
    const plan = {
      id:'plan-a',tenantId:'A',patientId:'patient-a',professionalId:'prof-a',status:'draft',
      currentVersion:1,versionId:v1.id,createdBy:'dentist-a',createdAt:serverTimestamp(),lastAuditLogId:log.id,
    };
    const version = {
      id:v1.id,planId:root.id,tenantId:'A',patientId:'patient-a',version:1,status:'draft',
      items:[item],quoteEnabled:false,note:'Plano clínico básico',appointmentId:'',
      createdBy:'dentist-a',createdAt:serverTimestamp(),auditLogId:log.id,
    };
    await assertFails(setDoc(root,plan));
    await assertSucceeds(runTransaction(dentist,async tx=>{
      tx.set(root,plan);
      tx.set(v1,version);
      tx.set(log,{tenantId:'A',actorId:'dentist-a',actorRole:'dentist',action:'treatment_plan.create',
        resourceType:'treatmentPlan',resourceId:root.id,timestamp:serverTimestamp()});
    }));
    expect((await assertSucceeds(getDoc(root))).data()?.currentVersion).toBe(1);
    expect((await assertSucceeds(getDoc(v1))).data()?.items[0].unitPriceCents).toBe(0);
    await assertFails(getDoc(doc(other,'tenants/A/treatmentPlans/plan-a')));
    await assertFails(getDoc(doc(receptionist,'tenants/A/treatmentPlans/plan-a')));
    await assertFails(updateDoc(v1,{note:'Mudar versão histórica'}));
    await assertFails(deleteDoc(v1));
    await assertFails(deleteDoc(root));

    const v2 = doc(dentist,'tenants/A/treatmentPlans/plan-a/versions/version-a2');
    const log2 = doc(dentist,'tenants/A/auditLogs/plan-a-audit-2');
    const update = writeBatch(dentist);
    update.update(root,{currentVersion:2,versionId:v2.id,status:'approved',lastAuditLogId:log2.id,updatedAt:serverTimestamp()});
    update.set(v2,{...version,id:v2.id,version:2,status:'approved',auditLogId:log2.id});
    update.set(log2,{tenantId:'A',actorId:'dentist-a',actorRole:'dentist',action:'treatment_plan.revise',
      resourceType:'treatmentPlan',resourceId:root.id,timestamp:serverTimestamp()});
    await assertSucceeds(update.commit());
    expect((await getDoc(v1)).data()?.status).toBe('draft');
    expect((await getDoc(root)).data()?.status).toBe('approved');

    const v3 = doc(dentist,'tenants/A/treatmentPlans/plan-a/versions/version-a3');
    const log3 = doc(dentist,'tenants/A/auditLogs/plan-a-audit-3');
    const forged = writeBatch(dentist);
    forged.update(root,{currentVersion:3,versionId:v3.id,status:'in_progress',lastAuditLogId:log3.id,updatedAt:serverTimestamp()});
    forged.set(v3,{...version,id:v3.id,version:3,status:'in_progress',
      items:[{...item,quantity:10}],auditLogId:log3.id});
    forged.set(log3,{tenantId:'A',actorId:'dentist-a',actorRole:'dentist',action:'treatment_plan.revise',
      resourceType:'treatmentPlan',resourceId:root.id,timestamp:serverTimestamp()});
    await assertFails(forged.commit());
    expect((await getDoc(root)).data()?.currentVersion).toBe(2);
  });

  it('D2: orçamento não pode ser criado no Essencial e exige Pro', async () => {
    const dentist=env.authenticatedContext('dentist-a').firestore();
    const submit=()=> {
      const root=doc(dentist,'tenants/A/treatmentPlans/plan-quoted');
      const rev=doc(dentist,'tenants/A/treatmentPlans/plan-quoted/versions/quote-v1');
      const audit=doc(dentist,'tenants/A/auditLogs/quote-audit');
      const batch=writeBatch(dentist);
      batch.set(root,{id:root.id,tenantId:'A',patientId:'patient-a',professionalId:'prof-a',
        currentVersion:1,versionId:rev.id,status:'draft',createdBy:'dentist-a',createdAt:serverTimestamp(),
        lastAuditLogId:audit.id});
      batch.set(rev,{id:rev.id,planId:root.id,tenantId:'A',patientId:'patient-a',
        version:1,status:'draft',items:[{
          procedureId:'proc-a',description:'Consulta clínica',toothId:'16',stage:'planned',quantity:1,unitPriceCents:12000,
        }],quoteEnabled:true,note:'Proposta, sem cobrança',appointmentId:'',
        createdBy:'dentist-a',createdAt:serverTimestamp(),auditLogId:audit.id});
      batch.set(audit,{tenantId:'A',actorId:'dentist-a',actorRole:'dentist',action:'treatment_plan.create',
        resourceType:'treatmentPlan',resourceId:root.id,timestamp:serverTimestamp()});
      return batch.commit();
    };
    await assertFails(submit());
    await env.withSecurityRulesDisabled(async context=>{
      await updateDoc(doc(context.firestore(),'tenants/A'),{planId:'pro'});
    });
    await assertSucceeds(submit());
    const quote=await assertSucceeds(getDoc(doc(dentist,'tenants/A/treatmentPlans/plan-quoted/versions/quote-v1')));
    expect(quote.data()?.items[0].unitPriceCents).toBe(12000);
    await assertFails(getDoc(doc(env.authenticatedContext('dentist-b').firestore(),'tenants/A/treatmentPlans/plan-quoted')));
  });

  it('odontograma cria somente evento clínico auditado e proíbe mutações ou acesso transversal', async () => {
    const dentist = env.authenticatedContext('dentist-a').firestore();
    const b = env.authenticatedContext('dentist-b').firestore();
    const reception = env.authenticatedContext('reception-a').firestore();
    const entry = doc(dentist, 'tenants/A/patients/patient-a/odontogramEvents/event-a');
    const audit = doc(dentist, 'tenants/A/auditLogs/odontogram-event-a');
    const input = {
      id: 'event-a', tenantId: 'A', patientId: 'patient-a',
      toothId: '16', surface: 'occlusal', finding: 'restoration',
      note: 'Restauração previamente observada', createdBy: 'dentist-a',
      createdAt: serverTimestamp(), auditLogId: audit.id,
    };
    await assertFails(setDoc(entry, input));
    await assertSucceeds(runTransaction(dentist, async tx => {
      tx.set(entry, input);
      tx.set(audit, {
        tenantId: 'A', actorId: 'dentist-a', actorRole: 'dentist',
        action: 'odontogram_event.create', resourceType: 'odontogramEvent',
        resourceId: entry.id, patientId: 'patient-a', timestamp: serverTimestamp(),
      });
    }));
    expect((await assertSucceeds(getDoc(entry))).data()?.toothId).toBe('16');
    await assertFails(getDoc(doc(b, 'tenants/A/patients/patient-a/odontogramEvents/event-a')));
    await assertFails(getDoc(doc(reception, 'tenants/A/patients/patient-a/odontogramEvents/event-a')));
    await assertFails(updateDoc(entry, { note: 'sobrescrever histórico' }));
    await assertFails(deleteDoc(entry));
    const correction = doc(dentist, 'tenants/A/patients/patient-a/odontogramEvents/event-correction');
    const correctionAudit = doc(dentist, 'tenants/A/auditLogs/odontogram-correction');
    await assertSucceeds(runTransaction(dentist, async tx => {
      tx.set(correction, {
        ...input, id: correction.id, supersedesEventId: entry.id,
        note: 'Correção de descrição após revisão clínica', auditLogId: correctionAudit.id,
      });
      tx.set(correctionAudit, {
        tenantId: 'A', actorId: 'dentist-a', actorRole: 'dentist',
        action: 'odontogram_event.create', resourceType: 'odontogramEvent',
        resourceId: correction.id, patientId: 'patient-a', timestamp: serverTimestamp(),
      });
    }));
    expect((await getDoc(entry)).data()?.note).toBe('Restauração previamente observada');
    expect((await getDoc(correction)).data()?.supersedesEventId).toBe(entry.id);
    const cross = doc(dentist, 'tenants/A/patients/patient-a/odontogramEvents/cross-patient-event');
    const crossAudit = doc(dentist, 'tenants/A/auditLogs/cross-patient-audit');
    await assertFails(runTransaction(dentist, async tx => {
      tx.set(cross, {
        ...input, id: cross.id, toothId: '19',
        supersedesEventId: 'event-from-other-tenant', auditLogId: crossAudit.id,
      });
      tx.set(crossAudit, {
        tenantId: 'A', actorId: 'dentist-a', actorRole: 'dentist',
        action: 'odontogram_event.create', resourceType: 'odontogramEvent',
        resourceId: cross.id, patientId: 'patient-a', timestamp: serverTimestamp(),
      });
    }));
  });


  it('D4: token privado e fila de pré-cadastros isolada entre tenants e papéis', async () => {
    await env.withSecurityRulesDisabled(async context => {
      const db=context.firestore();
      await updateDoc(doc(db,'tenants/A'),{planId:'pro'});
      await setDoc(doc(db,'tenants/A/intakeTokens/hash-do-token'), {
        tenantId:'A',createdBy:'reception-a',usedAt:null,
        createdAt:serverTimestamp(),expiresAt:Timestamp.fromMillis(Date.now()+86400000),
      });
      await setDoc(doc(db,'tenants/A/patientIntakeSubmissions/intake-a'),{
        id:'intake-a',tenantId:'A',tokenId:'hash-do-token',status:'pending_review',
        name:'Pessoa Fictícia',phone:'(17) 99999-9999',email:'fake@example.test',submittedAt:serverTimestamp(),
      });
    });
    const reception=env.authenticatedContext('reception-a').firestore();
    const dentist=env.authenticatedContext('dentist-a').firestore();
    const b=env.authenticatedContext('dentist-b').firestore();
    const queue=doc(reception,'tenants/A/patientIntakeSubmissions/intake-a');
    await assertSucceeds(getDoc(queue));
    await assertSucceeds(getDocs(query(collection(reception,'tenants/A/patientIntakeSubmissions'),where('tenantId','==','A'))));
    await assertFails(getDoc(doc(dentist,'tenants/A/patientIntakeSubmissions/intake-a')));
    await assertFails(getDoc(doc(b,'tenants/A/patientIntakeSubmissions/intake-a')));
    await assertFails(getDoc(doc(reception,'tenants/A/intakeTokens/hash-do-token')));
    await assertFails(getDoc(doc(reception,'tenants/A/bookingTokens/secret-hash')));
    await assertFails(setDoc(doc(reception,'tenants/A/bookingTokens/forged'),{tenantId:'A'}));
    await assertFails(setDoc(doc(reception,'tenants/A/intakeTokens/forged'),{tenantId:'A'}));
    await assertFails(setDoc(doc(reception,'tenants/A/patientIntakeSubmissions/forged'),{tenantId:'A',status:'approved'}));
    await assertFails(updateDoc(queue,{status:'approved',name:'Alteração sem autorização'}));

    const audit=doc(reception,'tenants/A/auditLogs/intake-review-audit');
    const batch=writeBatch(reception);
    batch.update(queue,{status:'approved',reviewedBy:'reception-a',reviewedAt:serverTimestamp(),lastAuditLogId:audit.id});
    batch.set(audit,{tenantId:'A',actorId:'reception-a',actorRole:'receptionist',action:'intake.review',
      resourceType:'intakeSubmission',resourceId:'intake-a',timestamp:serverTimestamp()});
    await assertSucceeds(batch.commit());
    expect((await getDoc(queue)).data()?.status).toBe('approved');
    await assertFails(updateDoc(queue,{status:'pending_review'}));
    await assertFails(deleteDoc(queue));
  });

  it('D4: Essencial não lê fila de pré-cadastro por link',async()=>{
    const reception=env.authenticatedContext('reception-a').firestore();
    await assertFails(getDocs(query(collection(reception,'tenants/A/patientIntakeSubmissions'),where('tenantId','==','A'))));
  });

  it('Central de Retorno Pro: cria/atualiza com auditoria, nega forgery e acesso cruzado', async () => {
    await env.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      await Promise.all([
        updateDoc(doc(db, 'tenants/A'), { planId: 'pro' }),
        updateDoc(doc(db, 'tenants/B'), { planId: 'pro' }),
      ]);
    });
    const owner = env.authenticatedContext('tenant-owner-a').firestore();
    const receptionist = env.authenticatedContext('reception-a').firestore();
    const assistant = env.authenticatedContext('assistant-a').firestore();
    const record = doc(owner, 'tenants/A/recalls/recall-a');
    const createAudit = doc(owner, 'tenants/A/auditLogs/recall-create-audit');
    const draft = {
      id: 'recall-a', tenantId: 'A', patientId: 'patient-a', reason: 'Retorno clínico programado',
      dueAt: '2026-12-20T12:00:00.000Z', status: 'planned',
      createdBy: 'tenant-owner-a', createdAt: serverTimestamp(), lastAuditLogId: createAudit.id,
    };
    await assertFails(setDoc(record, draft));
    const createBatch = writeBatch(owner);
    createBatch.set(record, draft);
    createBatch.set(createAudit, {
      tenantId: 'A', actorId: 'tenant-owner-a', actorRole: 'tenant_owner', action: 'recall.create',
      resourceType: 'recall', resourceId: record.id, timestamp: serverTimestamp(),
    });
    await assertSucceeds(createBatch.commit());
    expect((await assertSucceeds(getDoc(record))).data()?.status).toBe('planned');
    await assertSucceeds(getDoc(doc(receptionist, 'tenants/A/recalls/recall-a')));
    await assertFails(getDoc(doc(assistant, 'tenants/A/recalls/recall-a')));
    await assertFails(getDoc(doc(owner, 'tenants/B/recalls/recall-a')));
    await assertFails(setDoc(doc(owner, 'tenants/B/recalls/forged'), { ...draft, id: 'forged', tenantId: 'B' }));
    await assertFails(deleteDoc(record));

    const updateAudit = doc(owner, 'tenants/A/auditLogs/recall-update-audit');
    const updateBatch = writeBatch(owner);
    updateBatch.update(record, {
      status: 'contacted', lastContactAt: serverTimestamp(), updatedAt: serverTimestamp(), lastAuditLogId: updateAudit.id,
    });
    updateBatch.set(updateAudit, {
      tenantId: 'A', actorId: 'tenant-owner-a', actorRole: 'tenant_owner', action: 'recall.update',
      resourceType: 'recall', resourceId: record.id, timestamp: serverTimestamp(),
    });
    await assertSucceeds(updateBatch.commit());
    expect((await getDoc(record)).data()?.status).toBe('contacted');
    await assertFails(updateDoc(record, { patientId: 'patient-b' }));
    await assertFails(updateDoc(record, { status: 'dismissed' }));

    const crossPatient = doc(owner, 'tenants/A/recalls/recall-cross');
    const crossAudit = doc(owner, 'tenants/A/auditLogs/recall-cross-audit');
    const crossBatch = writeBatch(owner);
    crossBatch.set(crossPatient, {
      ...draft, id: 'recall-cross', patientId: 'patient-b', lastAuditLogId: crossAudit.id,
    });
    crossBatch.set(crossAudit, {
      tenantId: 'A', actorId: 'tenant-owner-a', actorRole: 'tenant_owner',
      action: 'recall.create', resourceType: 'recall', resourceId: crossPatient.id, timestamp: serverTimestamp(),
    });
    await assertFails(crossBatch.commit());
  });

  it('Central de Retorno não abre no Essencial, mesmo com permissão de recepção', async () => {
    const receptionist = env.authenticatedContext('reception-a').firestore();
    await assertFails(getDocs(collection(receptionist, 'tenants/A/recalls')));
    await assertFails(setDoc(doc(receptionist, 'tenants/A/recalls/essential-write'), {
      tenantId: 'A', id: 'essential-write', patientId: 'patient-a', reason: 'Revisão',
      dueAt: '2026-12-20T12:00:00.000Z', status: 'planned',
      createdBy: 'reception-a', createdAt: serverTimestamp(), lastAuditLogId: 'none',
    }));
  });

  it('mantém a demo somente leitura mesmo com membership ativa', async () => {
    await env.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      await Promise.all([
        setDoc(doc(db, 'tenants/D'), { ...tenant('D'), planId: 'premium_demo', subscriptionStatus: 'demo' }),
        setDoc(doc(db, 'tenants/D/memberships/dentist-d'), {
          userId: 'dentist-d', tenantId: 'D', role: 'dentist', status: 'active', permissions: [...permissionTemplates.dentist],
        }),
        setDoc(doc(db, 'tenants/D/patients/patient-d'), { id: 'patient-d', tenantId: 'D', name: 'Paciente fictício', status: 'active' }),
      ]);
    });
    const demoDb = env.authenticatedContext('dentist-d').firestore();
    await assertFails(updateDoc(doc(demoDb, 'tenants/D/patients/patient-d'), { name: 'Tentativa de escrita' }));
    await assertFails(setDoc(doc(demoDb, 'tenants/D/patients/patient-new'), {
      id: 'patient-new', tenantId: 'D', name: 'Novo registro', status: 'active', createdBy: 'dentist-d',
      lastAuditLogId: 'demo-write-audit',
    }));
  });

  it('expõe somente branding público e impede Tenant A de alterá-lo em Tenant B', async () => {
    const a = env.authenticatedContext('dentist-a').firestore();
    expect((await assertSucceeds(getDoc(doc(a, 'tenants/A/publicProfile/public')))).data()?.publicName).toBe('Marca A');
    expect((await assertSucceeds(getDoc(doc(a, 'tenants/B/publicProfile/public')))).data()?.publicName).toBe('Marca B');
    await assertFails(setDoc(doc(a, 'tenants/B/publicProfile/public'), {
      tenantId: 'B', publicName: 'Alteração cruzada', tagline: '', description: '', phone: '', email: '',
      address: '', primaryColor: '#163d3a', accentColor: '#72b9ad', logoUrl: '',
      lastAuditLogId: 'forged',
    }));
    await assertFails(getDoc(doc(a, 'tenants/B/memberships/dentist-b')));
    await assertFails(getDoc(doc(a, 'tenants/B/patients/patient-b/clinicalPhotos/photo-b')));
  });

  it('nega mini-site público sem estado comercial explícito', async () => {
    await env.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      const unassigned = tenant('UNASSIGNED');
      delete (unassigned as Partial<typeof unassigned>).planId;
      delete (unassigned as Partial<typeof unassigned>).subscriptionStatus;
      await setDoc(doc(db, 'tenants/UNASSIGNED'), unassigned);
      await setDoc(doc(db, 'tenants/UNASSIGNED/publicProfile/public'), {
        tenantId: 'UNASSIGNED', publicName: 'Fixture fictício', tagline: '', description: '', phone: '', email: '', address: '',
        primaryColor: '#163d3a', accentColor: '#72b9ad', logoUrl: '',
      });
      await setDoc(doc(db, 'tenants/UNASSIGNED/memberships/unassigned-dentist'), {
        userId: 'unassigned-dentist', tenantId: 'UNASSIGNED', role: 'dentist', status: 'active', permissions: [...permissionTemplates.dentist],
      });
      await setDoc(doc(db, 'tenants/UNASSIGNED/patients/patient-fake'), {
        id: 'patient-fake', tenantId: 'UNASSIGNED', name: 'Paciente fictício', searchName: 'paciente ficticio', status: 'active',
      });
      await setDoc(doc(db, 'tenants/UNASSIGNED/patients/patient-fake/clinicalRecords/record-fake'), {
        id: 'record-fake', tenantId: 'UNASSIGNED', patientId: 'patient-fake', createdBy: 'unassigned-dentist', content: 'Registro de teste fictício',
      });
    });
    const anonymous = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anonymous, 'tenants/UNASSIGNED/publicProfile/public')));
    const clinician = env.authenticatedContext('unassigned-dentist').firestore();
    await assertSucceeds(getDoc(doc(clinician, 'tenants/UNASSIGNED/patients/patient-fake/clinicalRecords/record-fake')));
  });
});

describe('Firestore Emulator — concorrência dos locks de agenda', () => {
  it('serializa duas reservas simultâneas do mesmo profissional', async () => {
    await env.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      const first: AppointmentWindow = {
        professionalId: 'prof-a', resourceId: 'chair-a',
        startsAt: '2026-10-08T09:00:00.000Z', endsAt: '2026-10-08T10:00:00.000Z',
      };
      const second: AppointmentWindow = {
        professionalId: 'prof-a', resourceId: 'chair-b',
        startsAt: '2026-10-08T09:30:00.000Z', endsAt: '2026-10-08T10:30:00.000Z',
      };
      const lockId = scheduleLockIds(first).find(id => id.startsWith('professional_'))!;
      const lock = doc(db, 'tenants/A/scheduleLocks', lockId);
      const reserve = (candidate: AppointmentWindow, id: string) => runTransaction(db, async transaction => {
        const current = await transaction.get(lock);
        const reservations = current.exists() ? current.data().reservations as Reservation[] : [];
        const conflict = findScheduleConflict(candidate, reservations, [], id);
        if (conflict) throw new Error('conflict:' + conflict);
        transaction.set(lock, {
          tenantId: 'A',
          reservations: [...reservations, { ...candidate, id, status: 'confirmed' }],
        });
      });
      const results = await Promise.allSettled([reserve(first, 'appt-one'), reserve(second, 'appt-two')]);
      expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
      const finalLock = await getDoc(lock);
      expect(finalLock.data()?.reservations).toHaveLength(1);
    });
  });

});


describe('D4 — Firestore Rules para pedidos públicos não confirmados',()=>{
  async function seedRequest(){
    await env.withSecurityRulesDisabled(async context=>{
      const db=context.firestore();
      await Promise.all([
        setDoc(doc(db,'tenants/A/openBookingRequests/req-a'),{
          id:'req-a',tenantId:'A',name:'Paciente Fictício',phone:'11988887777',
          email:'fake@example.test',preferredAt:'2026-11-10T14:00:00.000Z',
          submittedAt:Timestamp.now(),status:'pending_review',
        }),
        setDoc(doc(db,'tenants/B/openBookingRequests/req-b'),{
          id:'req-b',tenantId:'B',name:'Paciente Fictício B',phone:'11988887777',
          email:'fakeb@example.test',preferredAt:'2026-11-10T14:00:00.000Z',
          submittedAt:Timestamp.now(),status:'pending_review',
        }),
      ]);
    });
  }
  it('bloqueia leitura, criação, alteração e exclusão anônimas; protege o outro tenant',async()=>{
    await seedRequest();
    const anon=env.unauthenticatedContext().firestore();
    const reception=env.authenticatedContext('reception-a').firestore();
    const other=env.authenticatedContext('dentist-b').firestore();
    await assertFails(getDoc(doc(anon,'tenants/A/openBookingRequests/req-a')));
    await assertFails(setDoc(doc(anon,'tenants/A/openBookingRequests/req-new'),{
      tenantId:'A',status:'pending_review',name:'Injetado',
    }));
    await assertFails(deleteDoc(doc(anon,'tenants/A/openBookingRequests/req-a')));
    await assertSucceeds(getDoc(doc(reception,'tenants/A/openBookingRequests/req-a')));
    await assertSucceeds(getDocs(query(collection(reception,'tenants/A/openBookingRequests'),where('tenantId','==','A'))));
    await assertFails(getDoc(doc(reception,'tenants/B/openBookingRequests/req-b')));
    await assertFails(getDoc(doc(other,'tenants/A/openBookingRequests/req-a')));
    await assertFails(updateDoc(doc(reception,'tenants/A/openBookingRequests/req-a'),{
      status:'contacted',
    })); // missing audit and actor: review cannot bypass workflow
  });
  it('permite registrar contato apenas com auditoria em batch e bloqueia replay',async()=>{
    await seedRequest();
    const reception=env.authenticatedContext('reception-a').firestore();
    const entry=doc(reception,'tenants/A/openBookingRequests/req-a');
    const audit=doc(reception,'tenants/A/auditLogs/review-open-a');
    const batch=writeBatch(reception);
    batch.update(entry,{
      status:'contacted',reviewedAt:serverTimestamp(),reviewedBy:'reception-a',lastAuditLogId:audit.id,
    });
    batch.set(audit,{
      tenantId:'A',actorId:'reception-a',actorRole:'receptionist',
      action:'open_booking_request.review',resourceType:'openBookingRequest',
      resourceId:'req-a',timestamp:serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
    expect((await getDoc(entry)).data()?.status).toBe('contacted');
    await assertFails(updateDoc(entry,{status:'dismissed'}));
    await assertFails(deleteDoc(entry));
  });
  it('somente o tenant owner altera publicProfile com flag opt-in auditada',async()=>{
    // Legacy fixture bypasses Rules and has no prior audit; real public profiles have one.
    await env.withSecurityRulesDisabled(async context=>{
      const db=context.firestore();
      await updateDoc(doc(db,'tenants/A/publicProfile/public'),{lastAuditLogId:'seed'});
    });
    const owner=env.authenticatedContext('tenant-owner-a').firestore();
    const dentist=env.authenticatedContext('dentist-a').firestore();
    const profile=doc(owner,'tenants/A/publicProfile/public');
    const audit=doc(owner,'tenants/A/auditLogs/audit-optin');
    const batch=writeBatch(owner);
    batch.update(profile,{openBookingRequestsEnabled:true,lastAuditLogId:audit.id,updatedAt:serverTimestamp()});
    batch.set(audit,{tenantId:'A',actorId:'tenant-owner-a',actorRole:'tenant_owner',
      action:'publicProfile.update',resourceType:'publicProfile',resourceId:'public',
      timestamp:serverTimestamp()});
    await assertSucceeds(batch.commit());
    expect((await getDoc(profile)).data()?.openBookingRequestsEnabled).toBe(true);
    await assertFails(updateDoc(doc(dentist,'tenants/A/publicProfile/public'),{
      openBookingRequestsEnabled:false,
    }));
  });
});

describe('D5 — proteção explícita dos manifestos privados de backup',()=>{
  const path='tenants/A/patients/patient-a/clinicalPhotos/photo-a/backups/'+ 'a'.repeat(64);
  it('nega leitura e gravação direta de manifestos ao dentista, dono, platform owner e anônimo',async()=>{
    await env.withSecurityRulesDisabled(async context=>{
      await setDoc(doc(context.firestore(),path),{
        tenantId:'A',patientId:'patient-a',photoId:'photo-a',
        sha256:'a'.repeat(64),verification:'sha256_readback',
        backupKey:'snapshots/private',sizeBytes:3,
      });
    });
    for(const auth of [env.authenticatedContext('dentist-a'),
      env.authenticatedContext('tenant-owner-a'),env.authenticatedContext('platform-owner'),
      env.unauthenticatedContext()]){
      const db=auth.firestore(),entry=doc(db,path);
      await assertFails(getDoc(entry));
      await assertFails(setDoc(entry,{tenantId:'A',sha256:'forged'},{merge:true}));
      await assertFails(deleteDoc(entry));
    }
    await assertFails(getDoc(doc(env.authenticatedContext('dentist-b').firestore(),path)));
  });
});


describe('D4 — toggle público exige tenant_owner real no backend',()=>{
  async function fixture(){
    await env.withSecurityRulesDisabled(async context=>{
      await updateDoc(doc(context.firestore(),'tenants/A/publicProfile/public'),{
        lastAuditLogId:'seed',
      });
    });
  }
  async function auditedProfileUpdate(actor:string,role:string,delta:Record<string,unknown>,auditId:string){
    const db=env.authenticatedContext(actor).firestore();
    const batch=writeBatch(db);
    batch.update(doc(db,'tenants/A/publicProfile/public'),{
      ...delta,lastAuditLogId:auditId,updatedAt:serverTimestamp(),
    });
    batch.set(doc(db,'tenants/A/auditLogs',auditId),{
      tenantId:'A',actorId:actor,actorRole:role,action:'publicProfile.update',
      resourceType:'publicProfile',resourceId:'public',timestamp:serverTimestamp(),
    });
    return batch.commit();
  }
  it('permite ao tenant_owner habilitar/desabilitar, mas bloqueia plataforma e outros perfis',async()=>{
    await fixture();
    await assertFails(auditedProfileUpdate('platform-owner','platform_owner',{
      openBookingRequestsEnabled:true,
    },'bad-platform-enable'));
    await assertFails(auditedProfileUpdate('dentist-a','dentist',{
      openBookingRequestsEnabled:true,
    },'bad-dentist-enable'));
    await assertSucceeds(auditedProfileUpdate('tenant-owner-a','tenant_owner',{
      openBookingRequestsEnabled:true,
    },'good-owner-enable'));
    const profile=doc(env.authenticatedContext('tenant-owner-a').firestore(),'tenants/A/publicProfile/public');
    expect((await getDoc(profile)).data()?.openBookingRequestsEnabled).toBe(true);
    await assertFails(auditedProfileUpdate('platform-owner','platform_owner',{
      openBookingRequestsEnabled:false,
    },'bad-platform-disable'));
    await assertSucceeds(auditedProfileUpdate('tenant-owner-a','tenant_owner',{
      openBookingRequestsEnabled:false,
    },'good-owner-disable'));
    expect((await getDoc(profile)).data()?.openBookingRequestsEnabled).toBe(false);
  });
  it('preserva edição auditada de branding pela plataforma se não muda opt-in',async()=>{
    await fixture();
    await assertSucceeds(auditedProfileUpdate('platform-owner','platform_owner',{
      publicName:'Clínica A identidade revisada',
    },'platform-brand-only'));
    const db=env.authenticatedContext('tenant-owner-a').firestore();
    expect((await getDoc(doc(db,'tenants/A/publicProfile/public'))).data()?.publicName)
      .toBe('Clínica A identidade revisada');
  });
});
