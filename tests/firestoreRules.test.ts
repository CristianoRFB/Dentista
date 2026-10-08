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
      setDoc(doc(db, 'tenants/B/memberships/dentist-b'), { userId: 'dentist-b', tenantId: 'B', role: 'dentist', status: 'active', permissions: [...permissionTemplates.dentist] }),
      setDoc(doc(db, 'tenants/A/memberships/reception-a'), { userId: 'reception-a', tenantId: 'A', role: 'receptionist', status: 'active', permissions: [...permissionTemplates.receptionist] }),
      setDoc(doc(db, 'tenants/A/memberships/inactive-a'), { userId: 'inactive-a', tenantId: 'A', role: 'dentist', status: 'inactive', permissions: [...permissionTemplates.dentist] }),
      setDoc(doc(db, 'tenants/S/memberships/dentist-s'), { userId: 'dentist-s', tenantId: 'S', role: 'dentist', status: 'active', permissions: [...permissionTemplates.dentist] }),
      setDoc(doc(db, 'platformOwners/platform-owner'), { status: 'active' }),
      setDoc(doc(db, 'tenants/A/patients/patient-a'), { id: 'patient-a', tenantId: 'A', name: 'Paciente Fictício A', searchName: 'paciente ficticio a', status: 'active' }),
      setDoc(doc(db, 'tenants/B/patients/patient-b'), { id: 'patient-b', tenantId: 'B', name: 'Paciente Fictício B', searchName: 'paciente ficticio b', status: 'active' }),
      setDoc(doc(db, 'tenants/A/professionals/prof-a'), { id: 'prof-a', tenantId: 'A', displayName: 'Dentista A', status: 'active' }),
      setDoc(doc(db, 'tenants/B/professionals/prof-b'), { id: 'prof-b', tenantId: 'B', displayName: 'Dentista B', status: 'active' }),
      setDoc(doc(db, 'tenants/A/appointments/appt-a'), { id: 'appt-a', tenantId: 'A', patientId: 'patient-a', professionalId: 'prof-a', startsAt: '2026-10-08T09:00:00.000Z', endsAt: '2026-10-08T10:00:00.000Z', status: 'confirmed' }),
      setDoc(doc(db, 'tenants/B/appointments/appt-b'), { id: 'appt-b', tenantId: 'B', patientId: 'patient-b', professionalId: 'prof-b', startsAt: '2026-10-08T09:00:00.000Z', endsAt: '2026-10-08T10:00:00.000Z', status: 'confirmed' }),
      setDoc(doc(db, 'tenants/A/publicProfile/public'), { tenantId: 'A', publicName: 'Marca A', tagline: '', description: '', phone: '', email: '', address: '', primaryColor: '#163d3a', accentColor: '#72b9ad', logoUrl: '' }),
      setDoc(doc(db, 'tenants/B/publicProfile/public'), { tenantId: 'B', publicName: 'Marca B', tagline: '', description: '', phone: '', email: '', address: '', primaryColor: '#163d3a', accentColor: '#72b9ad', logoUrl: '' }),
      setDoc(doc(db, 'tenants/A/patients/patient-a/clinicalPhotos/photo-a'), { id: 'photo-a', tenantId: 'A', patientId: 'patient-a', objectKey: 'tenants/A/patients/patient-a/photo-a.webp', contentType: 'image/webp' }),
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

  it('mantém receptionist sem clinical.write e não permite gravar prontuário', async () => {
    const reception = env.authenticatedContext('reception-a').firestore();
    await assertFails(getDoc(doc(reception, 'tenants/A/patients/patient-a/clinicalRecords/record-a')));
    await assertFails(setDoc(doc(reception, 'tenants/A/patients/patient-a/clinicalRecords/record-a'), {
      tenantId: 'A', patientId: 'patient-a', dentistId: 'prof-a', recordType: 'note',
      content: 'Não autorizado', createdBy: 'reception-a', createdAt: serverTimestamp(), auditLogId: 'fake',
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
