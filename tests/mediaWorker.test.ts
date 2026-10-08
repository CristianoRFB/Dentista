import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mediaWorker from '../workers/media-api/src/index';
import { verifyFirebaseIdToken } from '../workers/media-api/src/firebaseAuth';

vi.mock('../workers/media-api/src/firebaseAuth', () => {
  return { verifyFirebaseIdToken: vi.fn(async () => ({ uid: 'dentist-a' })) };
});

const projectId = 'demo-odontoflow';
const originalFetch = globalThis.fetch;
const documents = new Map<string, Record<string, unknown>>();
const writes: unknown[] = [];
const storedObjects = new Map<string, { bytes: Uint8Array; contentType: string }>();
const fetchCalls: string[] = [];

function documentFields(value: Record<string, unknown>) {
  const encode = (item: unknown): Record<string, unknown> => {
    if (item === null) return { nullValue: 'NULL' };
    if (item instanceof Date) return { timestampValue: item.toISOString() };
    if (typeof item === 'string') return { stringValue: item };
    if (typeof item === 'boolean') return { booleanValue: item };
    if (typeof item === 'number') return Number.isInteger(item) ? { integerValue: String(item) } : { doubleValue: item };
    if (Array.isArray(item)) return { arrayValue: { values: item.map(encode) } };
    return { mapValue: { fields: Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, nested]) => [key, encode(nested)])) } };
  };
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)]));
}

function seedAccess({
  role = 'dentist', status = 'active', permissions = ['clinical.read', 'clinical.write'], patientTenantId = 'A',
}: { role?: string; status?: string; permissions?: string[]; patientTenantId?: string } = {}) {
  documents.clear();
  documents.set('tenants/A', { id: 'A', status: 'active' });
  documents.set('tenants/A/memberships/dentist-a', {
    userId: 'dentist-a', tenantId: 'A', role, status, permissions,
  });
  documents.set('tenants/A/patients/patient-a', {
    id: 'patient-a', tenantId: patientTenantId, status: 'active',
  });
}

function firestoreDoc(path: string, data: Record<string, unknown>) {
  return {
    name: `projects/${projectId}/databases/(default)/documents/${path}`,
    fields: documentFields(data),
  };
}

const env = {
  FIREBASE_PROJECT_ID: projectId,
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8081',
  APP_ORIGIN: 'https://app.test',
  CLINICAL_MEDIA: {
    put: vi.fn(async (key: string, stream: ReadableStream<Uint8Array>, options: { httpMetadata?: { contentType?: string } }) => {
      const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
      storedObjects.set(key, { bytes, contentType: options.httpMetadata?.contentType ?? 'application/octet-stream' });
    }),
    get: vi.fn(async (key: string) => {
      const object = storedObjects.get(key);
      if (!object) return null;
      return { body: new Blob([object.bytes]).stream(), httpMetadata: { contentType: object.contentType } };
    }),
    delete: vi.fn(async (key: string) => { storedObjects.delete(key); }),
  },
} as unknown as Parameters<typeof mediaWorker.fetch>[1];

beforeAll(async () => {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    fetchCalls.push(url.toString());
    if (url.hostname === '127.0.0.1' && url.port === '8081') {
      if (url.pathname.endsWith(':beginTransaction')) return new Response(JSON.stringify({ transaction: 'media-test-transaction' }), { status: 200 });
      if (url.pathname.endsWith(':commit')) {
        const body = init?.body ? JSON.parse(String(init.body)) as { writes?: unknown[] } : {};
        writes.push(...(body.writes ?? []));
        return new Response(JSON.stringify({ writeResults: [] }), { status: 200 });
      }
      const marker = '/documents/';
      const index = url.pathname.indexOf(marker);
      const path = decodeURIComponent(url.pathname.slice(index + marker.length));
      const data = documents.get(path);
      return data
        ? new Response(JSON.stringify(firestoreDoc(path, data)), { status: 200, headers: { 'Content-Type': 'application/json' } })
        : new Response(JSON.stringify({ error: { status: 'NOT_FOUND' } }), { status: 404 });
    }
    return originalFetch(input, init);
  });
});

afterAll(() => { globalThis.fetch = originalFetch; });

beforeEach(() => {
  seedAccess();
  writes.length = 0;
  fetchCalls.length = 0;
  storedObjects.clear();
  vi.mocked(env.CLINICAL_MEDIA.put).mockClear();
  vi.mocked(env.CLINICAL_MEDIA.get).mockClear();
  vi.mocked(verifyFirebaseIdToken).mockReset().mockResolvedValue({ uid: 'dentist-a' });
});

async function upload(token: string) {
  const form = new FormData();
  form.set('tenantId', 'A');
  form.set('patientId', 'patient-a');
  form.set('file', new File([new Uint8Array([0xff, 0xd8, 0xff, 0x00])], 'photo.jpg', { type: 'image/jpeg' }));
  return mediaWorker.fetch(new Request('https://worker.test/v1/media', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, Origin: 'https://app.test' }, body: form,
  }), env);
}

describe('Worker de mídia clínica', () => {
  it('autoriza upload, grava objeto privado tenant/patient-scoped e metadata auditável', async () => {
    const response = await upload('verified-test-token');
    const payload = await response.json() as { photoId: string; objectKey: string; url?: string };
    expect(response.status, JSON.stringify({ payload, fetchCalls })).toBe(201);
    expect(payload.objectKey).toMatch(/^tenants\/A\/patients\/patient-a\//);
    expect(payload.url).toBeUndefined();
    expect(env.CLINICAL_MEDIA.put).toHaveBeenCalledOnce();
    expect(writes).toHaveLength(2);
    expect(JSON.stringify(writes)).toContain('uploaderId');
    expect(JSON.stringify(writes)).toContain('clinical_photo.upload');
  });

  it.each([
    ['permission ausente', { permissions: ['clinical.read'] }, 403],
    ['membership inativa', { status: 'inactive' }, 403],
    ['patient de outro tenant', { patientTenantId: 'B' }, 404],
  ])('nega upload quando há %s sem armazenar arquivo', async (_label, options, expectedStatus) => {
    seedAccess(options);
    const response = await upload('verified-test-token');
    expect(response.status).toBe(expectedStatus);
    expect(env.CLINICAL_MEDIA.put).not.toHaveBeenCalled();
  });

  it('entrega mídia apenas na rota autenticada e com cache privado sem URL pública', async () => {
    const objectKey = 'tenants/A/patients/patient-a/photo-a.jpg';
    documents.set('tenants/A/patients/patient-a/clinicalPhotos/photo-a', {
      id: 'photo-a', tenantId: 'A', patientId: 'patient-a', objectKey,
    });
    storedObjects.set(objectKey, { bytes: new Uint8Array([0xff, 0xd8, 0xff]), contentType: 'image/jpeg' });
    const response = await mediaWorker.fetch(new Request('https://worker.test/v1/media/photo-a?tenantId=A&patientId=patient-a', {
      headers: { Authorization: 'Bearer verified-test-token', Origin: 'https://app.test' },
    }), env);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('private');
    expect(response.headers.get('Location')).toBeNull();
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.test');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([0xff, 0xd8, 0xff]));
  });

  it('recusa token Firebase inválido antes de tocar dados ou R2', async () => {
    vi.mocked(verifyFirebaseIdToken).mockRejectedValueOnce(new Error('invalid signature'));
    const response = await upload('bad-test-token');
    expect(response.status).toBe(401);
    expect(env.CLINICAL_MEDIA.put).not.toHaveBeenCalled();
    expect(fetchCalls).toEqual([]);
  });
});
