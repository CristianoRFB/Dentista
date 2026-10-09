import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import appointmentWorker from '../workers/media-api/src/index';

vi.mock('../workers/media-api/src/firebaseAuth', () => ({
  verifyFirebaseIdToken: vi.fn(async () => ({ uid: 'dentist-a' })),
}));

type FsValue = Record<string, any>;
type Tx = { snapshot: number; reads: Set<string>; queries: Set<string> };

const projectId = 'demo-odontoflow';
const documents = new Map<string, Record<string, unknown>>();
const versions = new Map<string, number>();
const transactions = new Map<string, Tx>();
let currentVersion = 0;
let transactionNumber = 0;

function encodeValue(value: unknown): FsValue {
  if (value === null) return { nullValue: 'NULL' };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, encodeValue(item)])) } };
}

function decodeValue(value: FsValue): unknown {
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decodeValue);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields ?? {}).map(([key, item]) => [key, decodeValue(item)]));
  return null;
}

function encodeFields(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined).map(([key, value]) => [key, encodeValue(value)]));
}

function decodeFields(fields: Record<string, FsValue> = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

function firestoreDocument(path: string, data: Record<string, unknown>) {
  return {
    name: `projects/${projectId}/databases/(default)/documents/${path}`,
    fields: encodeFields(data),
  };
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
}

function seed() {
  documents.clear();
  versions.clear();
  transactions.clear();
  currentVersion = 0;
  transactionNumber = 0;
  const rows: Array<[string, Record<string, unknown>]> = [
    ['tenants/A', { id: 'A', status: 'active', planId: 'pro', subscriptionStatus: 'active', features: {}, limitOverrides: {} }],
    ['tenants/B', { id: 'B', status: 'active', planId: 'essential', subscriptionStatus: 'active', features: {}, limitOverrides: {} }],
    ['tenants/A/memberships/dentist-a', {
      userId: 'dentist-a', tenantId: 'A', role: 'tenant_owner', status: 'active', permissions: ['appointments.manage','memberships.manage','professionals.manage','resources.manage'],
    }],
    ['tenants/A/patients/patient-a', { id: 'patient-a', tenantId: 'A', status: 'active' }],
    ['tenants/B/patients/patient-b', { id: 'patient-b', tenantId: 'B', status: 'active' }],
    ['tenants/A/professionals/prof-a', { id: 'prof-a', tenantId: 'A', status: 'active' }],
    ['tenants/A/professionals/prof-b', { id: 'prof-b', tenantId: 'A', status: 'active' }],
    ['tenants/B/professionals/prof-b', { id: 'prof-b', tenantId: 'B', status: 'active' }],
    ['tenants/A/scheduleResources/chair-a', { id: 'chair-a', tenantId: 'A', active: true }],
    ['tenants/A/scheduleResources/chair-b', { id: 'chair-b', tenantId: 'A', active: true }],
    ['tenants/B/scheduleResources/chair-b', { id: 'chair-b', tenantId: 'B', active: true }],
    ['tenants/A/procedures/proc-a', { id: 'proc-a', tenantId: 'A', active: true }],
    ['tenants/A/appointments/appt-a', {
      id: 'appt-a', tenantId: 'A', patientId: 'patient-a', professionalId: 'prof-a',
      startsAt: '2026-10-08T09:00:00.000Z', endsAt: '2026-10-08T10:00:00.000Z', status: 'confirmed',
    }],
    ['tenants/A/appointments/appt-resource', {
      id: 'appt-resource', tenantId: 'A', patientId: 'patient-a', professionalId: 'prof-b', resourceId: 'chair-a',
      startsAt: '2026-10-08T13:00:00.000Z', endsAt: '2026-10-08T14:00:00.000Z', status: 'confirmed',
    }],
  ];
  for (const [path, data] of rows) {
    documents.set(path, data);
    versions.set(path, ++currentVersion);
  }
}

function fieldValue(value: FsValue): unknown {
  return decodeValue(value);
}

function matchesFilter(data: Record<string, unknown>, filter: Record<string, any>) {
  const actual = data[filter.field.fieldPath];
  const expected = fieldValue(filter.value);
  switch (filter.op) {
    case 'EQUAL': return actual === expected;
    case 'GREATER_THAN_OR_EQUAL': return typeof actual === 'string' && typeof expected === 'string' && actual >= expected;
    case 'LESS_THAN': return typeof actual === 'string' && typeof expected === 'string' && actual < expected;
    default: return false;
  }
}

async function fakeFirestoreFetch(input: RequestInfo | URL, init?: RequestInit) {
  await new Promise(resolve => setTimeout(resolve, 0));
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.hostname !== 'mock-firestore') return new Response('', { status: 502 });
  const pathMarker = '/documents/';
  const markerIndex = url.pathname.indexOf(pathMarker);
  const body = init?.body ? JSON.parse(String(init.body)) as Record<string, any> : {};

  if (url.pathname.endsWith(':beginTransaction')) {
    const id = 'tx-' + (++transactionNumber);
    transactions.set(id, { snapshot: currentVersion, reads: new Set(), queries: new Set() });
    return jsonResponse({ transaction: id });
  }

  if (url.pathname.endsWith(':rollback')) {
    if (typeof body.transaction === 'string') transactions.delete(body.transaction);
    return jsonResponse({});
  }

  if (url.pathname.endsWith(':commit')) {
    const tx = transactions.get(String(body.transaction));
    if (!tx) return jsonResponse({ error: { status: 'NOT_FOUND' } }, 404);
    const changedRead = [...tx.reads].some(path => (versions.get(path) ?? 0) > tx.snapshot);
    const changedQuery = [...tx.queries].some(path => [...versions].some(([changedPath, version]) => changedPath.startsWith(path + '/') && version > tx.snapshot));
    if (changedRead || changedQuery) {
      transactions.delete(String(body.transaction));
      return jsonResponse({ error: { status: 'ABORTED', message: 'transaction conflict' } }, 409);
    }
    for (const write of body.writes ?? []) {
      const name = String(write.update.name);
      const path = name.slice(name.indexOf(pathMarker) + pathMarker.length);
      if (write.currentDocument?.exists === false && documents.has(path)) {
        transactions.delete(String(body.transaction));
        return jsonResponse({ error: { status: 'ALREADY_EXISTS' } }, 409);
      }
    }
    for (const write of body.writes ?? []) {
      const name = String(write.update.name);
      const path = name.slice(name.indexOf(pathMarker) + pathMarker.length);
      documents.set(path, decodeFields(write.update.fields));
      versions.set(path, ++currentVersion);
    }
    transactions.delete(String(body.transaction));
    return jsonResponse({ writeResults: (body.writes ?? []).map(() => ({})) });
  }

  if (url.pathname.endsWith(':runQuery')) {
    const transaction = typeof body.transaction === 'string' ? transactions.get(body.transaction) : undefined;
    const parent = decodeURIComponent(url.pathname.slice(markerIndex + pathMarker.length).replace(/:runQuery$/, ''));
    const collectionPath = parent + '/' + body.structuredQuery.from[0].collectionId;
    transaction?.queries.add(collectionPath);
    const where = body.structuredQuery.where;
    const filters = where.fieldFilter
      ? [where.fieldFilter]
      : where.compositeFilter.filters.map((filter: Record<string, any>) => filter.fieldFilter ?? filter);
    const results = [...documents.entries()]
      .filter(([path]) => path.startsWith(collectionPath + '/') && path.slice(collectionPath.length + 1).indexOf('/') < 0)
      .filter(([, data]) => filters.every((filter: Record<string, any>) => matchesFilter(data, filter)))
      .map(([path, data]) => {
        transaction?.reads.add(path);
        return { document: firestoreDocument(path, data) };
      });
    return jsonResponse(results);
  }

  const path = decodeURIComponent(url.pathname.slice(markerIndex + pathMarker.length));
  const transactionId = url.searchParams.get('transaction');
  const transaction = transactionId ? transactions.get(transactionId) : undefined;
  transaction?.reads.add(path);
  const data = documents.get(path);
  return data ? jsonResponse(firestoreDocument(path, data)) : jsonResponse({ error: { status: 'NOT_FOUND' } }, 404);
}

const workerEnv = {
  FIREBASE_PROJECT_ID: projectId,
  FIRESTORE_EMULATOR_HOST: 'mock-firestore',
  APP_ORIGIN: 'https://app.test',
  CLINICAL_MEDIA: { put: async () => undefined, get: async () => null, delete: async () => undefined },
} as unknown as Parameters<typeof appointmentWorker.fetch>[1];

beforeEach(() => {
  seed();
  vi.stubGlobal('fetch', fakeFirestoreFetch);
});

afterAll(() => { vi.unstubAllGlobals(); });

async function save({
  tenantId = 'A', patientId = 'patient-a', professionalId = 'prof-a', resourceId = 'chair-a',
  startsAt = '2026-10-08T11:00:00.000Z', endsAt = '2026-10-08T12:00:00.000Z',
  procedureIds = [], appointmentId,
}: {
  tenantId?: string; patientId?: string; professionalId?: string; resourceId?: string;
  startsAt?: string; endsAt?: string; procedureIds?: string[]; appointmentId?: string;
} = {}) {
  return appointmentWorker.fetch(new Request('https://worker.test/v1/appointments', {
    method: 'POST',
    headers: { Authorization: 'Bearer valid-test-token', Origin: 'https://app.test', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId, patientId, professionalId, resourceId, startsAt, endsAt, procedureIds, ...(appointmentId ? { appointmentId } : {}) }),
  }), workerEnv);
}

async function mutateCapacity(kind: 'professionals' | 'resources' | 'memberships', operation: 'create' | 'activate' | 'deactivate' | 'update', values: Record<string, unknown>, recordId?: string, tenantId = 'A') {
  return appointmentWorker.fetch(new Request('https://worker.test/v1/tenants/capacity', {
    method: 'POST',
    headers: { Authorization: 'Bearer valid-test-token', Origin: 'https://app.test', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId, kind, operation, values, recordId }),
  }), workerEnv);
}

describe('Worker de agendamentos — validação e persistência', () => {
  it('persiste consulta, locks e audit log para tenant ativo', async () => {
    const response = await save({ procedureIds: ['proc-a'] });
    const result = await response.json() as { id: string; tenantId: string; status: string };
    expect(response.status, JSON.stringify(result)).toBe(200);
    expect(result).toMatchObject({ tenantId: 'A', status: 'confirmed' });
    expect(documents.get('tenants/A/appointments/' + result.id)).toMatchObject({ patientId: 'patient-a', professionalId: 'prof-a' });
    expect([...documents.keys()].some(path => path.startsWith('tenants/A/scheduleLocks/'))).toBe(true);
    expect([...documents.values()].some(data => data.action === 'appointment.create' && data.resourceId === result.id)).toBe(true);
  });

  it('nega agendamento sem membership ou com identificadores de outro tenant', async () => {
    const crossTenant = await save({ tenantId: 'B', patientId: 'patient-b', professionalId: 'prof-b', resourceId: 'chair-b' });
    expect(crossTenant.status).toBe(403);
    const wrongPatient = await save({ patientId: 'patient-b' });
    expect(wrongPatient.status).toBe(400);
    const inactiveProcedure = await save({ procedureIds: ['missing-procedure'] });
    expect(inactiveProcedure.status).toBe(400);
  });

  it('nega conflito por profissional, recurso e bloqueio', async () => {
    const professionalConflict = await save({ startsAt: '2026-10-08T09:30:00.000Z', endsAt: '2026-10-08T10:30:00.000Z' });
    expect(professionalConflict.status).toBe(409);
    const resourceConflict = await save({ startsAt: '2026-10-08T13:30:00.000Z', endsAt: '2026-10-08T14:30:00.000Z' });
    expect(resourceConflict.status).toBe(409);
    documents.set('tenants/A/scheduleBlocks/blocked', {
      id: 'blocked', tenantId: 'A', startsAt: '2026-10-08T11:30:00.000Z', endsAt: '2026-10-08T12:30:00.000Z', active: true,
    });
    const blocked = await save();
    expect(blocked.status).toBe(409);
  });

  it('atualiza locks ao remarcar e libera o horário ao cancelar', async () => {
    const createdResponse = await save();
    const created = await createdResponse.json() as { id: string };
    const rescheduled = await save({ appointmentId: created.id, startsAt: '2026-10-08T12:00:00.000Z', endsAt: '2026-10-08T13:00:00.000Z' });
    expect(rescheduled.status).toBe(200);
    const cancelled = await appointmentWorker.fetch(new Request('https://worker.test/v1/appointments/' + created.id + '/cancel?tenantId=A', {
      method: 'POST', headers: { Authorization: 'Bearer valid-test-token', Origin: 'https://app.test' },
    }), workerEnv);
    expect(cancelled.status).toBe(200);
    expect(documents.get('tenants/A/appointments/' + created.id)?.status).toBe('cancelled');
    expect((await save({ startsAt: '2026-10-08T12:00:00.000Z', endsAt: '2026-10-08T13:00:00.000Z' })).status).toBe(200);
  });

  it('serializa chamadas concorrentes do Worker no lock compartilhado do profissional', async () => {
    const results = await Promise.all([
      save({ startsAt: '2026-10-08T15:00:00.000Z', endsAt: '2026-10-08T16:00:00.000Z', resourceId: 'chair-a' }),
      save({ startsAt: '2026-10-08T15:30:00.000Z', endsAt: '2026-10-08T16:30:00.000Z', resourceId: 'chair-b' }),
    ]);
    expect(results.map(response => response.status).sort()).toEqual([200, 409]);
  });
});

describe('Worker de limites comerciais', () => {
  it('serializa cadastros concorrentes e impede ultrapassar a cota de profissionais', async () => {
    const results = await Promise.all([
      mutateCapacity('professionals', 'create', { displayName: 'Dentista 3', specialty: 'Clínica geral' }),
      mutateCapacity('professionals', 'create', { displayName: 'Dentista 4', specialty: 'Ortodontia' }),
    ]);
    expect(results.map(response => response.status).sort()).toEqual([200, 409]);
    expect(documents.get('tenants/A/limitCounters/professionals')?.count).toBe(3);
    expect([...documents.entries()].filter(([path, item]) => path.startsWith('tenants/A/professionals/') && item.status === 'active').length).toBe(3);
  });

  it('permite inativar acima da nova cota e depois reativar somente se houver capacidade', async () => {
    documents.set('tenants/A', { ...documents.get('tenants/A'), planId: 'essential' });
    documents.set('tenants/A/limitCounters/professionals', { tenantId: 'A', kind: 'professionals', count: 2 });
    const inactive = await mutateCapacity('professionals', 'deactivate', {}, 'prof-b');
    expect(inactive.status).toBe(200);
    expect(documents.get('tenants/A/limitCounters/professionals')?.count).toBe(1);
    expect((await mutateCapacity('professionals', 'activate', {}, 'prof-b')).status).toBe(409);
  });

  it('permite inativação quando o contador ainda não existe, sem bloqueio comercial', async () => {
    documents.set('tenants/A', { ...documents.get('tenants/A'), planId: 'essential', subscriptionStatus: 'cancelled' });
    documents.delete('tenants/A/limitCounters/professionals');
    const response = await mutateCapacity('professionals', 'deactivate', {}, 'prof-b');
    expect(response.status).toBe(200);
    expect(documents.get('tenants/A/professionals/prof-b')?.status).toBe('inactive');
    expect(documents.has('tenants/A/limitCounters/professionals')).toBe(false);
  });

  it('nega nova capacidade em trial expirado e bloqueia mutação na demo inclusive desativação', async () => {
    documents.set('tenants/A', {
      ...documents.get('tenants/A'), planId: 'pro', subscriptionStatus: 'trial', trialUntil: '2020-01-01T00:00:00.000Z',
    });
    expect((await mutateCapacity('professionals', 'create', { displayName: 'Dentista novo' })).status).toBe(403);
    documents.set('tenants/A', { ...documents.get('tenants/A'), planId: 'premium_demo', subscriptionStatus: 'demo' });
    expect((await mutateCapacity('professionals', 'deactivate', {}, 'prof-b')).status).toBe(409);
    expect(documents.get('tenants/A/professionals/prof-b')?.status).toBe('active');
  });

  it('não permite usar membership de Tenant A para alterar capacidade de Tenant B', async () => {
    expect((await mutateCapacity('professionals', 'create', { displayName: 'Dentista cruzado' }, undefined, 'B')).status).toBe(403);
    expect([...documents.keys()].some(path => path.startsWith('tenants/B/professionals/'))).toBe(true);
    expect(documents.has('tenants/B/limitCounters/professionals')).toBe(false);
  });

  it('não conta o tenant_owner no limite de memberships adicionais', async () => {
    for (let index = 1; index <= 5; index++) documents.set('tenants/A/memberships/member-' + index, {
      tenantId: 'A', userId: 'member-' + index, role: 'dentist', status: 'active', permissions: [],
    });
    const allowed = await mutateCapacity('memberships', 'create', { role: 'dentist', status: 'active' }, 'member-6');
    expect(allowed.status).toBe(200);
    const denied = await mutateCapacity('memberships', 'create', { role: 'dentist', status: 'active' }, 'member-7');
    expect(denied.status).toBe(409);
    expect(documents.get('tenants/A/limitCounters/memberships')?.count).toBe(6);
  });
});
