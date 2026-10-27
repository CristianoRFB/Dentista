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
  role = 'dentist', status = 'active', permissions = ['clinical.read', 'clinical.write'], patientTenantId = 'A', tenantStatus = 'active',
}: { role?: string; status?: string; permissions?: string[]; patientTenantId?: string; tenantStatus?: string } = {}) {
  documents.clear();
  documents.set('tenants/A', { id: 'A', status: tenantStatus, planId: 'premium', subscriptionStatus: 'active', features: {} });
  documents.set('tenants/B', { id: 'B', status: 'active', planId: 'essential', subscriptionStatus: 'active', features: {} });
  documents.set('tenants/A/memberships/dentist-a', {
    userId: 'dentist-a', tenantId: 'A', role, status, permissions,
  });
  documents.set('tenants/A/patients/patient-a', {
    id: 'patient-a', tenantId: patientTenantId, status: 'active',
  });
  documents.set('tenants/B/patients/patient-b', { id: 'patient-b', tenantId: 'B', status: 'active' });
}

function seedPlatformSupport({
  ownerStatus = 'active', actorId = 'platform-owner', reason = 'Investigação técnica solicitada',
  expiresAt = new Date(Date.now() + 60 * 60_000).toISOString(), revokedAt = null,
}: { ownerStatus?: string; actorId?: string; reason?: string; expiresAt?: string; revokedAt?: string | null } = {}) {
  documents.set('platformOwners/platform-owner', { status: ownerStatus });
  documents.set('platformSupportAccess/A', { tenantId: 'A', actorId, reason, expiresAt, revokedAt });
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

async function upload(token: string, file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0x00])], 'photo.jpg', { type: 'image/jpeg' })) {
  const form = new FormData();
  form.set('tenantId', 'A');
  form.set('patientId', 'patient-a');
  form.set('file', file);
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
    ['tenant suspenso', { tenantStatus: 'suspended' }, 404],
    ['role sem permissão clínica mesmo com permission forjada', { role: 'receptionist', permissions: ['clinical.read', 'clinical.write'] }, 403],
  ])('nega upload quando há %s sem armazenar arquivo', async (_label, options, expectedStatus) => {
    seedAccess(options);
    const response = await upload('verified-test-token');
    expect(response.status).toBe(expectedStatus);
    expect(env.CLINICAL_MEDIA.put).not.toHaveBeenCalled();
  });

  it('permite upload do Platform Owner apenas durante suporte clínico ativo e auditado', async () => {
    seedPlatformSupport();
    vi.mocked(verifyFirebaseIdToken).mockResolvedValueOnce({ uid: 'platform-owner' });
    const response = await upload('verified-test-token');
    expect(response.status).toBe(201);
    expect(JSON.stringify(writes)).toContain('platform_owner');
    expect(env.CLINICAL_MEDIA.put).toHaveBeenCalledOnce();
  });

  it('nega mídia quando a configuração operacional desliga a feature ou o tenant é demo', async () => {
    documents.set('tenants/A', { ...documents.get('tenants/A'), features: { clinical_photos: false } });
    expect((await upload('verified-test-token')).status).toBe(403);
    expect(env.CLINICAL_MEDIA.put).not.toHaveBeenCalled();
    documents.set('tenants/A', { ...documents.get('tenants/A'), planId: 'premium_demo', subscriptionStatus: 'demo', features: {} });
    expect((await upload('verified-test-token')).status).toBe(409);
    expect(env.CLINICAL_MEDIA.put).not.toHaveBeenCalled();
  });

  it.each([
    ['Platform Owner sem status ativo', { ownerStatus: 'pending' }],
    ['motivo insuficiente', { reason: 'curto' }],
    ['ator diferente do Platform Owner', { actorId: 'someone-else' }],
    ['suporte expirado', { expiresAt: new Date(Date.now() - 1000).toISOString() }],
    ['suporte revogado', { revokedAt: new Date().toISOString() }],
  ])('nega upload com %s', async (_label, support) => {
    seedPlatformSupport(support);
    vi.mocked(verifyFirebaseIdToken).mockResolvedValueOnce({ uid: 'platform-owner' });
    const response = await upload('verified-test-token');
    expect(response.status).toBe(403);
    expect(env.CLINICAL_MEDIA.put).not.toHaveBeenCalled();
  });

  it('rejeita conteúdo não-imagem e arquivos acima do limite técnico', async () => {
    const notImage = new File(['texto'], 'nota.txt', { type: 'text/plain' });
    expect((await upload('verified-test-token', notImage)).status).toBe(415);
    const oversized = new File([new Uint8Array(15 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' });
    expect((await upload('verified-test-token', oversized)).status).toBe(413);
    expect(env.CLINICAL_MEDIA.put).not.toHaveBeenCalled();
    expect(fetchCalls).toEqual([]);
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

  it('impede que o Dentist A use identificadores para ler mídia do Tenant B', async () => {
    const response = await mediaWorker.fetch(new Request('https://worker.test/v1/media/photo-b?tenantId=B&patientId=patient-b', {
      headers: { Authorization: 'Bearer verified-test-token', Origin: 'https://app.test' },
    }), env);
    expect(response.status).toBe(403);
    expect(env.CLINICAL_MEDIA.get).not.toHaveBeenCalled();
  });

  it('recusa token Firebase inválido antes de tocar dados ou R2', async () => {
    vi.mocked(verifyFirebaseIdToken).mockRejectedValueOnce(new Error('invalid signature'));
    const response = await upload('bad-test-token');
    expect(response.status).toBe(401);
    expect(env.CLINICAL_MEDIA.put).not.toHaveBeenCalled();
    expect(fetchCalls).toEqual([]);
  });
});


describe('D5 — ciclo de revisão e arquivamento sem exclusão clínica',()=>{
  function seedPhoto() {
    const key='tenants/A/patients/patient-a/photo-a.jpg';
    documents.set('tenants/A/patients/patient-a/clinicalPhotos/photo-a',{
      id:'photo-a',tenantId:'A',patientId:'patient-a',objectKey:key,status:'unverified',
      lifecycleStatus:'active',tags:[],createdBy:'dentist-a',
    });
    storedObjects.set(key,{bytes:new Uint8Array([0xff,0xd8,0xff]),contentType:'image/jpeg'});
    return key;
  }
  function review(action:'verify'|'reject'|'archive'|'restore',overrides:Record<string,unknown>={}){
    return mediaWorker.fetch(new Request('https://worker.test/v1/media/photo-a/review',{
      method:'POST',headers:{Authorization:'Bearer test-token',Origin:'https://app.test','Content-Type':'application/json'},
      body:JSON.stringify({tenantId:'A',patientId:'patient-a',action,reason:'Registro operacional para auditoria',tags:['frontal'],...overrides}),
    }),env);
  }
  it('classifica uma foto sem tocar no bucket R2 e gera auditoria com identidade',async()=>{
    const key=seedPhoto();
    const r=await review('verify');
    expect(r.status,await r.clone().text()).toBe(200);
    expect(await r.json()).toMatchObject({photoId:'photo-a',status:'verified',lifecycleStatus:'active',revision:1});
    expect(JSON.stringify(writes)).toContain('clinical_photo.verify');
    expect(JSON.stringify(writes)).toContain('lastAuditLogId');
    expect(JSON.stringify(writes)).toContain('frontal');
    expect(storedObjects.has(key)).toBe(true);
    expect(env.CLINICAL_MEDIA.delete).not.toHaveBeenCalled();
  });
  it('arquiva sem apagar nem impedir restauração autorizada',async()=>{
    const key=seedPhoto();
    const first=await review('archive');
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({lifecycleStatus:'archived'});
    expect(JSON.stringify(writes)).toContain('clinical_photo.archive');
    expect(storedObjects.has(key)).toBe(true);
    documents.set('tenants/A/patients/patient-a/clinicalPhotos/photo-a',{
      ...documents.get('tenants/A/patients/patient-a/clinicalPhotos/photo-a')!,
      lifecycleStatus:'archived',archivedAt:new Date().toISOString(),
    });
    writes.length=0;
    const second=await review('restore');
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({lifecycleStatus:'active'});
    expect(JSON.stringify(writes)).toContain('clinical_photo.restore');
    expect(storedObjects.has(key)).toBe(true);
    expect(env.CLINICAL_MEDIA.delete).not.toHaveBeenCalled();
  });
  it('nega revisão para leitor sem escrita, membership inativa e ID de outro tenant',async()=>{
    seedPhoto();
    seedAccess({permissions:['clinical.read']});
    expect((await review('verify')).status).toBe(403);
    seedAccess({status:'inactive'});
    expect((await review('verify')).status).toBe(403);
    seedAccess();
    expect((await review('verify',{tenantId:'B',patientId:'patient-b'})).status).toBe(403);
    expect(writes).toHaveLength(0);
  });
  it('nega demo, texto insuficiente e transições inválidas sem alterar objeto R2',async()=>{
    const key=seedPhoto();
    expect((await review('reject',{reason:'curto'})).status).toBe(400);
    expect((await review('restore')).status).toBe(409);
    documents.set('tenants/A',{...documents.get('tenants/A')!,planId:'premium_demo',subscriptionStatus:'demo'});
    expect((await review('archive')).status).toBe(409);
    expect(writes).toHaveLength(0);
    expect(storedObjects.has(key)).toBe(true);
  });
});


describe('D5 — revisão, arquivamento e restauração auditada', () => {
  function seedPhoto(){
    const objectKey='tenants/A/patients/patient-a/photo-a.jpg';
    documents.set('tenants/A/patients/patient-a/clinicalPhotos/photo-a',{
      id:'photo-a',tenantId:'A',patientId:'patient-a',objectKey,status:'unverified',
      lifecycleStatus:'active',tags:[],originalName:'clinical-image-photo-a.jpg',
      capturedAt:'2026-10-01T10:00:00.000Z',createdAt:'2026-10-01T10:00:00.000Z',
    });
    storedObjects.set(objectKey,{bytes:new Uint8Array([0xff,0xd8,0xff]),contentType:'image/jpeg'});
    return objectKey;
  }
  async function act(action:'verify'|'reject'|'archive'|'restore', options:Record<string,unknown>={}) {
    return mediaWorker.fetch(new Request('https://worker.test/v1/media/photo-a/review',{
      method:'POST',headers:{Authorization:'Bearer verified-test-token',Origin:'https://app.test',
        'Content-Type':'application/json'},
      body:JSON.stringify({tenantId:'A',patientId:'patient-a',action,
        reason:'Revisão técnica registrada pelo profissional',tags:['frontal'],...options}),
    }),env);
  }
  it('verifica foto com audit log e preserva os campos originais do Firestore sem tocar no R2',async()=>{
    const key=seedPhoto();
    const resp=await act('verify');
    expect(resp.status,await resp.clone().text()).toBe(200);
    expect((await resp.json() as {status:string}).status).toBe('verified');
    expect(writes).toHaveLength(2);
    const patch=writes[0] as {updateMask?:{fieldPaths?:string[]};update?:{fields?:Record<string,unknown>}};
    expect(patch.updateMask?.fieldPaths).toContain('status');
    expect(patch.updateMask?.fieldPaths).not.toContain('createdAt');
    expect(patch.updateMask?.fieldPaths).not.toContain('capturedAt');
    expect(patch.update?.fields).not.toHaveProperty('objectKey');
    expect(JSON.stringify(writes)).toContain('clinical_photo.verify');
    expect(storedObjects.has(key)).toBe(true);
    expect(env.CLINICAL_MEDIA.delete).not.toHaveBeenCalled();
  });
  it('arquivamento gera alteração lógica e audit log, sem exclusão de bytes',async()=>{
    const key=seedPhoto();
    const resp=await act('archive');
    expect(resp.status,await resp.clone().text()).toBe(200);
    expect((await resp.json() as {lifecycleStatus:string}).lifecycleStatus).toBe('archived');
    expect(JSON.stringify(writes)).toContain('clinical_photo.archive');
    expect(storedObjects.has(key)).toBe(true);
    expect(env.CLINICAL_MEDIA.delete).not.toHaveBeenCalled();
  });
  it('restaura somente imagem arquivada com autoria e campos de limpeza',async()=>{
    seedPhoto();
    documents.set('tenants/A/patients/patient-a/clinicalPhotos/photo-a',{
      ...documents.get('tenants/A/patients/patient-a/clinicalPhotos/photo-a')!,
      lifecycleStatus:'archived',archivedAt:'2026-10-02T10:00:00.000Z',archivedBy:'dentist-a',
    });
    const resp=await act('restore');
    expect(resp.status).toBe(200);
    const patch=writes[0] as {update?:{fields?:Record<string,unknown>}};
    expect(patch.update?.fields?.archivedAt).toEqual({nullValue:'NULL'});
    expect(JSON.stringify(writes)).toContain('clinical_photo.restore');
  });
  it('nega edição de outro tenant, recepção, usuário inativo e demo',async()=>{
    seedPhoto();
    expect((await act('verify',{tenantId:'B'})).status).toBe(403);
    seedAccess({role:'receptionist',permissions:['clinical.write']});
    expect((await act('verify')).status).toBe(403);
    seedAccess({status:'inactive'});
    expect((await act('verify')).status).toBe(403);
    seedAccess();
    documents.set('tenants/A',{...documents.get('tenants/A')!,planId:'premium_demo',subscriptionStatus:'demo'});
    expect((await act('verify')).status).toBe(409);
    expect(writes).toHaveLength(0);
  });
  it('rejeita motivo insuficiente, repetição de revisão e restauração de imagem ativa',async()=>{
    seedPhoto();
    expect((await act('verify',{reason:'curto'})).status).toBe(400);
    expect((await act('restore')).status).toBe(409);
    documents.set('tenants/A/patients/patient-a/clinicalPhotos/photo-a',{
      ...documents.get('tenants/A/patients/patient-a/clinicalPhotos/photo-a')!,status:'verified',
    });
    expect((await act('verify')).status).toBe(409);
    expect(writes).toHaveLength(0);
  });
});
