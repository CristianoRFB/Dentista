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
let failNextMediaTransactionStart = false;

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
    head: vi.fn(async (key:string) => storedObjects.has(key) ? {key} : null),
    put: vi.fn(async (key: string, stream: ReadableStream<Uint8Array>, options: { httpMetadata?: { contentType?: string } }) => {
      const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
      storedObjects.set(key, { bytes, contentType: options.httpMetadata?.contentType ?? 'application/octet-stream' });
      return {key};
    }),
    get: vi.fn(async (key: string) => {
      const object = storedObjects.get(key);
      if (!object) return null;
      return { body: new Blob([object.bytes]).stream(), httpMetadata: { contentType: object.contentType } };
    }),
    delete: vi.fn(async (key: string) => { storedObjects.delete(key); }),
    list: vi.fn(async (options: {prefix:string;limit?:number;cursor?:string}) => {
      const keys=[...storedObjects.keys()].filter(key=>key.startsWith(options.prefix)).sort();
      const after=options.cursor?keys.findIndex(key=>key===options.cursor)+1:0;
      const limit=options.limit??1000;
      const page=keys.slice(after,after+limit);
      const truncated=after+limit<keys.length;
      return {objects:page.map(key=>({key,size:storedObjects.get(key)?.bytes.length??0})),truncated,cursor:truncated?page.at(-1):undefined};
    }),
  },
} as unknown as Parameters<typeof mediaWorker.fetch>[1];

beforeAll(async () => {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    fetchCalls.push(url.toString());
    if (url.hostname === '127.0.0.1' && url.port === '8081') {
      if (url.pathname.endsWith(':runQuery')) {
        const collectionPath=url.pathname.split('/documents/')[1]?.split(':runQuery')[0]??'';
        const query=JSON.parse(String(init?.body??'{}')) as {
          structuredQuery?:{from?:{collectionId:string}[];limit?:number;startAt?:{values?:{referenceValue?:string}[]}}
        };
        const collectionId=query.structuredQuery?.from?.[0]?.collectionId??'clinicalPhotos';
        const prefix=decodeURIComponent(collectionPath)+'/'+collectionId+'/';
        const startAfter=query.structuredQuery?.startAt?.values?.[0]?.referenceValue?.split('/documents/')[1]??'';
        const entries=[...documents.entries()].filter(([path])=>path.startsWith(prefix)&&
          !path.slice(prefix.length).includes('/') && path>startAfter).sort(([a],[b])=>a.localeCompare(b))
          .slice(0,query.structuredQuery?.limit??100);
        return new Response(JSON.stringify(entries.map(([path,value])=>({document:firestoreDoc(path,value)}))),{status:200});
      }
      if (url.pathname.endsWith(':beginTransaction')) {
        if (failNextMediaTransactionStart) {
          failNextMediaTransactionStart=false;
          return new Response(JSON.stringify({error:{status:'UNAVAILABLE',message:'test transaction unavailable'}}),{status:503});
        }
        return new Response(JSON.stringify({ transaction: 'media-test-transaction' }), { status: 200 });
      }
      if (url.pathname.endsWith(':commit')) {
        const body = init?.body ? JSON.parse(String(init.body)) as { writes?: unknown[] } : {};
        writes.push(...(body.writes ?? []));
        return new Response(JSON.stringify({ writeResults: [] }), { status: 200 });
      }
      const marker = '/documents/';
      const index = url.pathname.indexOf(marker);
      const path = decodeURIComponent(url.pathname.slice(index + marker.length));
      if(path.endsWith('/backups')){
        const prefix=path+'/';
        const rows=[...documents.entries()].filter(([name])=>name.startsWith(prefix) &&
          !name.slice(prefix.length).includes('/')).sort(([a],[b])=>a.localeCompare(b));
        const page=rows.slice(0,50);
        return new Response(JSON.stringify({documents:page.map(([name,value])=>firestoreDoc(name,value))}),{
          status:200,headers:{'Content-Type':'application/json'},
        });
      }
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
  failNextMediaTransactionStart = false;
  delete (env as unknown as {CLINICAL_MEDIA_BACKUP?:unknown}).CLINICAL_MEDIA_BACKUP;
  vi.mocked(env.CLINICAL_MEDIA.head).mockClear();
  vi.mocked(env.CLINICAL_MEDIA.put).mockClear();
  vi.mocked(env.CLINICAL_MEDIA.get).mockClear();
  vi.mocked(env.CLINICAL_MEDIA.delete).mockClear();
  vi.mocked(env.CLINICAL_MEDIA.list).mockClear();
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
  it('compensa upload R2 se Firestore falhar antes de iniciar a transação', async () => {
    failNextMediaTransactionStart=true;
    const result=await upload('verified-test-token');
    expect(result.status).toBe(503);
    expect(env.CLINICAL_MEDIA.put).toHaveBeenCalledOnce();
    expect(env.CLINICAL_MEDIA.delete).toHaveBeenCalledOnce();
    expect(storedObjects.size).toBe(0);
    expect(writes).toHaveLength(0);
  });

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
    expect((await act('verify',{tenantId:'B'})).status).toBe(404);
    seedAccess();
    seedPhoto();
    documents.set('tenants/A',{...documents.get('tenants/A')!,features:{clinical_photos:false}});
    expect((await act('verify')).status).toBe(403);

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

describe('D5 — relatório de integridade de mídia por paciente',()=>{
  async function inspect(tenantId='A',patientId='patient-a'){
    return mediaWorker.fetch(new Request(
      'https://worker.test/v1/media/integrity?tenantId='+tenantId+'&patientId='+patientId,{
        headers:{Authorization:'Bearer verified-test-token',Origin:'https://app.test'},
      }),env);
  }
  it('mostra objetos ausentes e órfãos potenciais apenas da pasta do paciente, sem mudar o R2',async()=>{
    const prefix='tenants/A/patients/patient-a/';
    documents.set(prefix+'clinicalPhotos/photo-found',{
      id:'photo-found',tenantId:'A',patientId:'patient-a',objectKey:prefix+'photo-found.jpg',
    });
    documents.set(prefix+'clinicalPhotos/photo-missing',{
      id:'photo-missing',tenantId:'A',patientId:'patient-a',objectKey:prefix+'photo-missing.jpg',
    });
    storedObjects.set(prefix+'photo-found.jpg',{bytes:new Uint8Array([0xff,0xd8,0xff]),contentType:'image/jpeg'});
    storedObjects.set(prefix+'possible-orphan.jpg',{bytes:new Uint8Array([0xff,0xd8,0xff]),contentType:'image/jpeg'});
    storedObjects.set('tenants/B/patients/patient-b/private.jpg',{
      bytes:new Uint8Array([0xff,0xd8,0xff]),contentType:'image/jpeg',
    });
    const result=await inspect();
    expect(result.status,await result.clone().text()).toBe(200);
    const report=await result.json() as {complete:boolean;noFilesModified:boolean;findings:{kind:string;photoId?:string;objectKey?:string}[]};
    expect(report.complete).toBe(true);
    expect(report.noFilesModified).toBe(true);
    expect(report.findings.map(x=>x.kind).sort()).toEqual(['missing_r2_object','unreferenced_r2_candidate']);
    expect(JSON.stringify(report)).not.toContain('tenants/B/');
    expect(env.CLINICAL_MEDIA.delete).not.toHaveBeenCalled();
    expect(writes).toHaveLength(0);
  });
  it('nega inspeção sem identidade clínica de escrita e fora do tenant',async()=>{
    expect((await inspect('B','patient-b')).status).toBe(403);
    seedAccess({role:'receptionist',permissions:['clinical.read']});
    expect((await inspect()).status).toBe(403);
    seedAccess({status:'inactive'});
    expect((await inspect()).status).toBe(403);
    expect(env.CLINICAL_MEDIA.list).not.toHaveBeenCalled();
  });
  it('compara múltiplas páginas de metadata Firestore e de objetos R2 sem modificar arquivos',async()=>{
    const prefix='tenants/A/patients/patient-a/';
    for(let i=0;i<250;i++){
      const id='photo-'+String(i).padStart(4,'0');
      documents.set(prefix+'clinicalPhotos/'+id,{
        id,tenantId:'A',patientId:'patient-a',objectKey:prefix+id+'.jpg',
      });
      storedObjects.set(prefix+id+'.jpg',{bytes:new Uint8Array([0xff,0xd8,0xff]),contentType:'image/jpeg'});
    }
    for(let i=0;i<420;i++){
      storedObjects.set(prefix+'orphan-'+String(i).padStart(4,'0')+'.jpg',{
        bytes:new Uint8Array([0xff,0xd8,0xff]),contentType:'image/jpeg',
      });
    }
    const result=await inspect();
    expect(result.status,await result.clone().text()).toBe(200);
    const report=await result.json() as {complete:boolean;snapshotConsistent:boolean;checkedMetadata:number;checkedObjects:number;findings:{kind:string}[]};
    expect(report).toMatchObject({complete:true,snapshotConsistent:false,checkedMetadata:250,checkedObjects:670});
    expect(report.findings).toHaveLength(420);
    expect(report.findings.every(f=>f.kind==='unreferenced_r2_candidate')).toBe(true);
    expect(vi.mocked(env.CLINICAL_MEDIA.list).mock.calls.length).toBeGreaterThan(1);
    expect(env.CLINICAL_MEDIA.delete).not.toHaveBeenCalled();
    expect(writes).toHaveLength(0);
  });
  it('rejeita resultados parciais acima do teto de segurança mesmo com paginação',async()=>{
    for(let i=0;i<3001;i++)storedObjects.set('tenants/A/patients/patient-a/object-'+i+'.jpg',{
      bytes:new Uint8Array([0xff,0xd8,0xff]),contentType:'image/jpeg',
    });
    const result=await inspect();
    expect(result.status).toBe(409);
    expect((await result.json() as {error:string}).error).toBe('media_inventory_exceeds_safe_limit');
    expect(env.CLINICAL_MEDIA.delete).not.toHaveBeenCalled();
  });
});


describe('D5 — medição paginada e privada de bytes R2 por tenant',()=>{
  const request=(tenantId:string,cursor?:string)=>mediaWorker.fetch(new Request(
    'https://worker.test/v1/media/usage?'+new URLSearchParams({tenantId,...(cursor?{cursor}:{})}),{
      headers:{Authorization:'Bearer verified-test-token',Origin:'https://app.test'},
    }),env);

  it('restringe a medição ao owner com usage.read e não expõe nomes de objetos',async()=>{
    seedAccess({role:'tenant_owner',permissions:['usage.read']});
    storedObjects.set('tenants/A/patients/patient-a/a.jpg',{bytes:new Uint8Array(18),contentType:'image/jpeg'});
    storedObjects.set('tenants/B/patients/patient-b/secret.jpg',{bytes:new Uint8Array(99),contentType:'image/jpeg'});
    const response=await request('A');
    expect(response.status).toBe(200);
    const raw=await response.text();
    expect(raw).not.toContain('patient-a');
    expect(raw).not.toContain('secret.jpg');
    const body=JSON.parse(raw) as {bytes:number;objectCount:number;complete:boolean;readOnly:boolean;nextCursor:null};
    expect(body).toMatchObject({bytes:18,objectCount:1,complete:true,readOnly:true,nextCursor:null});
    expect(env.CLINICAL_MEDIA.list).toHaveBeenCalledWith({prefix:'tenants/A/patients/',limit:500});
    expect(env.CLINICAL_MEDIA.delete).not.toHaveBeenCalled();
    expect((await request('B')).status).toBe(403);
  });

  it('nega leitura de dentista comum, membro inativo, acesso anônimo e tenant inválido',async()=>{
    expect((await request('A')).status).toBe(403);
    seedAccess({role:'tenant_owner',status:'inactive',permissions:['usage.read']});
    expect((await request('A')).status).toBe(403);
    expect((await request('../B')).status).toBe(400);
    seedAccess({role:'tenant_owner',permissions:['usage.read']});
    expect((await request('A','cursor-with-x1f')).status).toBe(200);
    vi.mocked(env.CLINICAL_MEDIA.list).mockClear(); // Authorized cursor-read above is not an anonymous request.
    const unauthenticated=await mediaWorker.fetch(new Request('https://worker.test/v1/media/usage?tenantId=A'),env);
    expect(unauthenticated.status).toBe(401);
    expect(env.CLINICAL_MEDIA.list).not.toHaveBeenCalled();
  });

  it('pagina 501 objetos sem fornecer falsos totais ou misturar tenants',async()=>{
    seedAccess({role:'tenant_owner',permissions:['usage.read']});
    for(let i=0;i<501;i++) storedObjects.set(
      'tenants/A/patients/patient-a/image-'+String(i).padStart(4,'0')+'.jpg',
      {bytes:new Uint8Array(2),contentType:'image/jpeg'},
    );
    const first=await request('A');
    expect(first.status).toBe(200);
    const one=await first.json() as {bytes:number;objectCount:number;hasMore:boolean;nextCursor:string;complete:boolean};
    expect(one).toMatchObject({bytes:1000,objectCount:500,hasMore:true,complete:false});
    expect(one.nextCursor).toBeTruthy();
    const next=await request('A',one.nextCursor);
    expect(next.status).toBe(200);
    const two=await next.json() as {bytes:number;objectCount:number;hasMore:boolean;complete:boolean};
    expect(two).toMatchObject({bytes:2,objectCount:1,hasMore:false,complete:true});
    expect(one.bytes+two.bytes).toBe(1002);
  });
});


describe('D5 — cópias privadas verificadas e restauração manual sem sobrescrita',()=>{
  const originalKey='tenants/A/patients/patient-a/photo-a.jpg';
  const bytes=new Uint8Array([0xff,0xd8,0xff,0x00,0x01,0x02,0x03]);
  const copied=new Map<string,Uint8Array>();
  const backup={
    head:vi.fn(async(key:string)=>copied.has(key)?{key}:null),
    get:vi.fn(async(key:string)=>{
      const data=copied.get(key);
      return data?{body:new Blob([data]).stream()}:null;
    }),
    put:vi.fn(async(key:string,value:ArrayBuffer)=>{
      copied.set(key,new Uint8Array(value));return {key};
    }),
    delete:vi.fn(async(key:string)=>{copied.delete(key);}),
  };
  const request=(path:string,body:Record<string,unknown>,authed=true)=>mediaWorker.fetch(new Request('https://worker.test'+path,{
    method:'POST',headers:{Origin:'https://app.test','Content-Type':'application/json',...(authed?{Authorization:'Bearer test'}:{})},
    body:JSON.stringify(body),
  }),env);
  const payload={tenantId:'A',patientId:'patient-a',photoId:'photo-a',
    reason:'Verificação de contingência clínica autorizada'};
  function fixture(){
    copied.clear();
    for(const spy of [backup.head,backup.get,backup.put,backup.delete])spy.mockClear();
    (env as unknown as {CLINICAL_MEDIA_BACKUP:unknown}).CLINICAL_MEDIA_BACKUP=backup;
    documents.set('tenants/A/patients/patient-a/clinicalPhotos/photo-a',{
      id:'photo-a',tenantId:'A',patientId:'patient-a',objectKey:originalKey,contentType:'image/jpeg',
    });
    storedObjects.set(originalKey,{bytes,contentType:'image/jpeg'});
  }
  it('falha fechado quando o bucket secundário não está configurado',async()=>{
    documents.set('tenants/A/patients/patient-a/clinicalPhotos/photo-a',{
      id:'photo-a',tenantId:'A',patientId:'patient-a',objectKey:originalKey,
    });
    const r=await request('/v1/media/backups',payload);
    expect(r.status).toBe(503);
    expect(writes).toHaveLength(0);
  });
  it('faz cópia por hash, verifica por leitura de volta e audita sem divulgar URL privada',async()=>{
    fixture();
    const res=await request('/v1/media/backups',payload);
    expect(res.status,await res.clone().text()).toBe(200);
    const result=await res.json() as {digest:string;verified:boolean;private:boolean;alreadyBackedUp:boolean;sizeBytes:number;backupKey?:string};
    expect(result).toMatchObject({verified:true,private:true,alreadyBackedUp:false,sizeBytes:bytes.length});
    expect(result.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(result.backupKey).toBeUndefined();
    expect(copied.size).toBe(1);
    expect(backup.put).toHaveBeenCalledOnce();
    expect(backup.get).toHaveBeenCalledOnce();
    expect(JSON.stringify(writes)).toContain('clinical_photo.backup');
    expect(JSON.stringify(writes)).toContain(result.digest);
    expect(env.CLINICAL_MEDIA.delete).not.toHaveBeenCalled();
    expect(backup.delete).not.toHaveBeenCalled();
  });
  it('verifica snapshot existente sem sobrescrever e com auditLog append-only',async()=>{
    fixture();
    const first=await request('/v1/media/backups',payload);
    const result=await first.json() as {digest:string};
    const key=[...copied.keys()][0];
    documents.set('tenants/A/patients/patient-a/clinicalPhotos/photo-a/backups/'+result.digest,{
      id:result.digest,tenantId:'A',patientId:'patient-a',photoId:'photo-a',
      sha256:result.digest,objectKey:originalKey,backupKey:key,
    });
    writes.length=0;backup.put.mockClear();
    const second=await request('/v1/media/backups',payload);
    expect(second.status,await second.clone().text()).toBe(200);
    expect((await second.json() as {alreadyBackedUp:boolean}).alreadyBackedUp).toBe(true);
    expect(backup.put).not.toHaveBeenCalled();
    expect(JSON.stringify(writes)).toContain('clinical_photo.backup_verify');
    expect(writes).toHaveLength(1);
  });
  it('recusa segundo bucket adulterado, acesso cruzado ou profissional sem autorização',async()=>{
    fixture();
    seedAccess({role:'receptionist',permissions:['clinical.read','clinical.write']});
    expect((await request('/v1/media/backups',payload)).status).toBe(403);
    seedAccess();
    fixture();
    expect((await request('/v1/media/backups',{...payload,tenantId:'B',patientId:'patient-b'})).status).toBe(403);
    expect((await request('/v1/media/backups',{...payload,reason:'curto'})).status).toBe(400);
    expect((await request('/v1/media/backups',payload,false)).status).toBe(401);
    expect(writes).toHaveLength(0);
  });
  it('restaura somente original ausente de backup SHA-256 íntegro, com duas auditorias',async()=>{
    fixture();
    const backupResult=await request('/v1/media/backups',payload);
    const {digest}=await backupResult.json() as {digest:string};
    const backupKey=[...copied.keys()][0];
    documents.set('tenants/A/patients/patient-a/clinicalPhotos/photo-a/backups/'+digest,{
      tenantId:'A',patientId:'patient-a',photoId:'photo-a',sha256:digest,
      objectKey:originalKey,backupKey,
    });
    storedObjects.delete(originalKey);
    writes.length=0;vi.mocked(env.CLINICAL_MEDIA.put).mockClear();
    const res=await request('/v1/media/backups/restore',{...payload,digest});
    expect(res.status,await res.clone().text()).toBe(200);
    expect(await res.json()).toMatchObject({restored:true,verified:true,photoId:'photo-a',digest});
    expect(storedObjects.get(originalKey)?.bytes).toEqual(bytes);
    expect(env.CLINICAL_MEDIA.put).toHaveBeenCalledOnce();
    expect(JSON.stringify(writes)).toContain('clinical_photo.recovery_requested');
    expect(JSON.stringify(writes)).toContain('clinical_photo.recovery_verified');
    expect(backup.delete).not.toHaveBeenCalled();
    expect(env.CLINICAL_MEDIA.delete).not.toHaveBeenCalled();
  });
  it('bloqueia sobrescrita de original existente e backup alterado sem qualquer PUT',async()=>{
    fixture();
    const backupResult=await request('/v1/media/backups',payload);
    const {digest}=await backupResult.json() as {digest:string};
    const key=[...copied.keys()][0];
    documents.set('tenants/A/patients/patient-a/clinicalPhotos/photo-a/backups/'+digest,{
      tenantId:'A',patientId:'patient-a',photoId:'photo-a',sha256:digest,
      objectKey:originalKey,backupKey:key,
    });
    writes.length=0;vi.mocked(env.CLINICAL_MEDIA.put).mockClear();
    expect((await request('/v1/media/backups/restore',{...payload,digest})).status).toBe(409);
    storedObjects.delete(originalKey);
    copied.set(key,new Uint8Array([0x01,0x02,0x03]));
    expect((await request('/v1/media/backups/restore',{...payload,digest})).status).toBe(409);
    expect(env.CLINICAL_MEDIA.put).not.toHaveBeenCalled();
    expect(writes).toHaveLength(0);
  });
});


describe('D5 — catálogo de backups verificados sem vazamento de chaves R2',()=>{
  const req=(payload:Record<string,unknown>,authed=true)=>mediaWorker.fetch(new Request('https://worker.test/v1/media/backups/list',{
    method:'POST',headers:{Origin:'https://app.test','Content-Type':'application/json',
      ...(authed?{Authorization:'Bearer test'}:{})},body:JSON.stringify(payload),
  }),env);
  const ids={tenantId:'A',patientId:'patient-a',photoId:'photo-a'};
  const original='tenants/A/patients/patient-a/photo-a.jpg';
  function seed(){
    documents.set('tenants/A/patients/patient-a/clinicalPhotos/photo-a',{
      id:'photo-a',tenantId:'A',patientId:'patient-a',objectKey:original,
    });
  }
  it('lista manifestos verificados sem expor chaves R2, fotos ou motivo de auditoria',async()=>{
    seed();
    const digest='b'.repeat(64);
    documents.set('tenants/A/patients/patient-a/clinicalPhotos/photo-a/backups/'+digest,{
      id:digest,tenantId:'A',patientId:'patient-a',photoId:'photo-a',
      sha256:digest,backupKey:'snapshots/private-opaque-key',
      objectKey:original,sizeBytes:10,createdAt:'2026-10-31T14:30:00.000Z',
      verification:'sha256_readback',
    });
    const response=await req(ids);
    expect(response.status,await response.clone().text()).toBe(200);
    const body=await response.text();
    expect(body).not.toContain('snapshots/');
    expect(body).not.toContain('private-opaque-key');
    expect(body).not.toContain(original);
    expect(JSON.parse(body)).toMatchObject({photoId:'photo-a',hasMore:false,private:true,
      records:[{digest,sizeBytes:10}]});
  });
  it('nega visitante, clínica B, papel administrativo e campos extras',async()=>{
    seed();
    expect((await req(ids,false)).status).toBe(401);
    expect((await req({...ids,tenantId:'B',patientId:'patient-b'})).status).toBe(403);
    expect((await req({...ids,extra:'x'})).status).toBe(400);
    expect((await req({...ids,pageToken:'a'.repeat(3000)})).status).toBe(400);
    seedAccess({role:'tenant_owner',permissions:['clinical.read','clinical.write']});
    seed();
    expect((await req(ids)).status).toBe(403);
  });
});
