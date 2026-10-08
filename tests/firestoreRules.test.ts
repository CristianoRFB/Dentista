import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import {
  assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, Timestamp, writeBatch,
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
  features: {}, limits: {}, lastAuditLogId: 'seed',
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

  it('persiste pacientes, profissionais, procedimentos e recursos via camada de dados tenant-scoped', async () => {
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
    const professionalId = await createTenantRecordInDb(db, session, 'professionals', {
      displayName: 'Profissional de teste', specialty: 'Clínica geral', status: 'active',
    }, 'professionals.manage', 'professional.create', 'professional');
    const procedureId = await createTenantRecordInDb(db, session, 'procedures', {
      name: 'Consulta de teste', durationMinutes: 30, active: true,
    }, 'procedures.manage', 'procedure.create', 'procedure');
    const resourceId = await createTenantRecordInDb(db, session, 'scheduleResources', {
      name: 'Cadeira de teste', type: 'chair', active: true,
    }, 'resources.manage', 'resource.create', 'scheduleResource');

    expect((await assertSucceeds(getDoc(doc(db, 'tenants/A/patients', patientId)))).data()?.tenantId).toBe('A');
    expect((await assertSucceeds(getDoc(doc(db, 'tenants/A/professionals', professionalId)))).data()?.displayName).toBe('Profissional de teste');
    expect((await assertSucceeds(getDoc(doc(db, 'tenants/A/procedures', procedureId)))).data()?.active).toBe(true);
    expect((await assertSucceeds(getDoc(doc(db, 'tenants/A/scheduleResources', resourceId)))).data()?.active).toBe(true);

    await updateTenantRecordInDb(db, session, 'patients', patientId, { status: 'inactive' }, 'patients.manage', 'patient.deactivate', 'patient');
    await updateTenantRecordInDb(db, session, 'professionals', professionalId, { status: 'inactive' }, 'professionals.manage', 'professional.deactivate', 'professional');
    await updateTenantRecordInDb(db, session, 'procedures', procedureId, { active: false }, 'procedures.manage', 'procedure.deactivate', 'procedure');
    await updateTenantRecordInDb(db, session, 'scheduleResources', resourceId, { active: false }, 'resources.manage', 'resource.deactivate', 'scheduleResource');

    expect((await assertSucceeds(getDoc(doc(db, 'tenants/A/patients', patientId)))).data()?.status).toBe('inactive');
    expect((await assertSucceeds(getDoc(doc(db, 'tenants/A/professionals', professionalId)))).data()?.status).toBe('inactive');
    expect((await assertSucceeds(getDoc(doc(db, 'tenants/A/procedures', procedureId)))).data()?.active).toBe(false);
    expect((await assertSucceeds(getDoc(doc(db, 'tenants/A/scheduleResources', resourceId)))).data()?.active).toBe(false);
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
        resourceType: 'tenant', resourceId: tenantId, timestamp: serverTimestamp(),
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
    expect((await assertSucceeds(getDoc(profileRef))).data()?.publicName).toBe('Clínica C Atualizada');
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
