import { importPKCS8, SignJWT } from 'jose';
import { verifyFirebaseIdToken } from './firebaseAuth';
import { canCreateCommercialCapacity, canUse, getLimit } from '../../../src/commercial/entitlementService';
import {
  findScheduleConflict, isValidAppointmentWindow, MAX_CONFLICT_LOOKBACK_MS,
  scheduleLockIds, utcDayKeys, type AppointmentWindow, type Reservation, type ScheduleBlockWindow,
} from './scheduling';

interface Env {
  CLINICAL_MEDIA: R2Bucket;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_SERVICE_ACCOUNT_EMAIL?: string;
  FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?: string;
  FIRESTORE_EMULATOR_HOST?: string;
  APP_ORIGIN?: string;
}

interface UserIdentity { uid: string; }
interface FsValue {
  nullValue?: 'NULL';
  stringValue?: string;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  timestampValue?: string;
  arrayValue?: { values?: FsValue[] };
  mapValue?: { fields: Record<string, FsValue> };
}
interface FsDocument { name: string; fields?: Record<string, FsValue>; createTime?: string; updateTime?: string; }
interface FsReservation extends Reservation { id: string; status: string; }

const MAX_MEDIA_BYTES = 15 * 1024 * 1024;
const MAX_QUERY_RESULTS = 1000;
const firestoreScope = 'https://www.googleapis.com/auth/datastore';
let cachedGoogleToken: { value: string; expiresAt: number } | null = null;
type ServiceKey = Awaited<ReturnType<typeof importPKCS8>>;
let cachedServiceKey: ServiceKey | null = null;

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

class FirestoreError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

function response(request: Request, env: Env, status: number, body: BodyInit | null, headers: Record<string, string> = {}) {
  const outputHeaders = new Headers(headers);
  const origin = request.headers.get('Origin');
  const allowedOrigins = (env.APP_ORIGIN ?? 'http://localhost:5173').split(',').map(value => value.trim()).filter(Boolean);
  if (origin && allowedOrigins.includes(origin)) {
    outputHeaders.set('Access-Control-Allow-Origin', origin);
    outputHeaders.set('Vary', 'Origin');
    outputHeaders.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    outputHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    outputHeaders.set('Access-Control-Max-Age', '600');
  }
  if (typeof body === 'string' || body === null) {
    if (!outputHeaders.has('Content-Type')) outputHeaders.set('Content-Type', 'application/json; charset=utf-8');
  }
  return new Response(body, { status, headers: outputHeaders });
}

function json(request: Request, env: Env, status: number, data: Record<string, unknown>) {
  return response(request, env, status, JSON.stringify(data), { 'Content-Type': 'application/json; charset=utf-8' });
}

function validateOrigin(request: Request, env: Env) {
  const origin = request.headers.get('Origin');
  if (!origin) return;
  const allowed = (env.APP_ORIGIN ?? 'http://localhost:5173').split(',').map(value => value.trim()).filter(Boolean);
  if (!allowed.includes(origin)) throw new HttpError(403, 'origin_not_allowed');
}

async function authenticate(request: Request, env: Env): Promise<UserIdentity> {
  const raw = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!raw) throw new HttpError(401, 'missing_token');
  try {
    return await verifyFirebaseIdToken(raw, env.FIREBASE_PROJECT_ID);
  } catch {
    throw new HttpError(401, 'invalid_token');
  }
}

async function serviceAccountToken(env: Env): Promise<string> {
  if (env.FIRESTORE_EMULATOR_HOST) return 'owner';
  if (cachedGoogleToken && cachedGoogleToken.expiresAt > Date.now() + 60_000) return cachedGoogleToken.value;
  const email = env.FIREBASE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !privateKey) throw new HttpError(503, 'firestore_service_identity_not_configured');
  try {
    const serviceKey = cachedServiceKey ?? await importPKCS8(privateKey, 'RS256');
    cachedServiceKey = serviceKey;
    const assertion = await new SignJWT({ scope: firestoreScope })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setIssuer(email)
      .setSubject(email)
      .setAudience('https://oauth2.googleapis.com/token')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(serviceKey);
    const result = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });
    if (!result.ok) throw new Error('oauth_token_failed');
    const data = await result.json() as { access_token: string; expires_in?: number };
    cachedGoogleToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
    return data.access_token;
  } catch {
    throw new HttpError(503, 'firestore_service_identity_unavailable');
  }
}

function encodedDocumentPath(path: string) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function firestoreRoot(env: Env) {
  const host = env.FIRESTORE_EMULATOR_HOST
    ? 'http://' + env.FIRESTORE_EMULATOR_HOST.replace(/^https?:\/\//, '')
    : 'https://firestore.googleapis.com';
  return host + '/v1/projects/' + encodeURIComponent(env.FIREBASE_PROJECT_ID) + '/databases/(default)/documents';
}

function firestoreDocumentName(env: Env, path: string) {
  return 'projects/' + env.FIREBASE_PROJECT_ID + '/databases/(default)/documents/' + path;
}

function encodeValue(value: unknown): FsValue {
  if (value === null) return { nullValue: 'NULL' };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (typeof value === 'object') return { mapValue: { fields: encodeFields(value as Record<string, unknown>) } };
  throw new Error('unsupported_firestore_value');
}

function encodeFields(value: Record<string, unknown>): Record<string, FsValue> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => [key, encodeValue(item)]));
}

function decodeValue(value: FsValue): unknown {
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue?.values ?? []).map(decodeValue);
  if ('mapValue' in value) return decodeFields(value.mapValue?.fields ?? {});
  return null;
}

function decodeFields(fields: Record<string, FsValue> = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

function decodeDocument(document: FsDocument | undefined) {
  return document ? { ...decodeFields(document.fields), id: document.name.split('/').at(-1) ?? '' } as Record<string, any> : null;
}

async function firestoreRequest<T>(url: string, token: string, init: RequestInit = {}): Promise<T | null> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', 'Bearer ' + token);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const result = await fetch(url, { ...init, headers });
  if (result.status === 404) return null;
  const bodyText = await result.text();
  if (!result.ok) {
    let body: { error?: { status?: string; message?: string } } = {};
    try { body = JSON.parse(bodyText) as typeof body; } catch { /* keep the generic error */ }
    throw new FirestoreError(result.status, body.error?.status ?? 'UNKNOWN', body.error?.message ?? 'firestore_request_failed');
  }
  return bodyText ? JSON.parse(bodyText) as T : null;
}

async function getDocument(env: Env, token: string, path: string, transaction?: string) {
  const url = new URL(firestoreRoot(env) + '/' + encodedDocumentPath(path));
  if (transaction) url.searchParams.set('transaction', transaction);
  const result = await firestoreRequest<FsDocument>(url.toString(), token);
  return decodeDocument(result ?? undefined);
}

async function beginTransaction(env: Env, token: string) {
  const result = await firestoreRequest<{ transaction: string }>(firestoreRoot(env) + ':beginTransaction', token, {
    method: 'POST', body: JSON.stringify({ options: { readWrite: {} } }),
  });
  if (!result?.transaction) throw new HttpError(503, 'firestore_transaction_unavailable');
  return result.transaction;
}

async function rollbackTransaction(env: Env, token: string, transaction: string) {
  try {
    await firestoreRequest(firestoreRoot(env) + ':rollback', token, {
      method: 'POST', body: JSON.stringify({ transaction }),
    });
  } catch { /* a failed or expired transaction needs no further recovery */ }
}

async function commitTransaction(env: Env, token: string, transaction: string, writes: unknown[]) {
  return await firestoreRequest(firestoreRoot(env) + ':commit', token, {
    method: 'POST', body: JSON.stringify({ transaction, writes }),
  });
}

type Filter = { fieldPath: string; op: string; value: unknown; };

async function queryCollection(
  env: Env,
  token: string,
  parentPath: string,
  collectionId: string,
  filters: Filter[],
  transaction: string,
  limit = MAX_QUERY_RESULTS,
) {
  const url = firestoreRoot(env) + '/' + encodedDocumentPath(parentPath) + ':runQuery';
  const where = filters.length === 1
    ? { fieldFilter: { field: { fieldPath: filters[0].fieldPath }, op: filters[0].op, value: encodeValue(filters[0].value) } }
    : { compositeFilter: { op: 'AND', filters: filters.map(filter => ({ fieldFilter: {
      field: { fieldPath: filter.fieldPath }, op: filter.op, value: encodeValue(filter.value),
    } })) } };
  const result = await firestoreRequest<Array<{ document?: FsDocument }>>(url, token, {
    method: 'POST',
    body: JSON.stringify({
      structuredQuery: { from: [{ collectionId }], where, limit },
      transaction,
    }),
  });
  const rows = (result ?? []).flatMap(row => row.document ? [decodeDocument(row.document)!] : []);
  if (rows.length >= limit) throw new HttpError(503, 'schedule_validation_result_limit');
  return rows;
}

function documentWrite(env: Env, path: string, value: Record<string, unknown>, createOnly = false) {
  const write: Record<string, unknown> = {
    update: { name: firestoreDocumentName(env, path), fields: encodeFields(value) },
  };
  if (createOnly) write.currentDocument = { exists: false };
  return write;
}

function appointmentPermission(membership: Record<string, any>) {
  return hasRolePermission(membership, 'appointments.manage')
    && typeof membership.tenantId === 'string'
    && membership.tenantId.length > 0;
}

async function verifyAppointmentAccess(env: Env, token: string, transaction: string, uid: string, tenantId: string) {
  const [tenant, membership] = await Promise.all([
    getDocument(env, token, 'tenants/' + tenantId, transaction),
    getDocument(env, token, 'tenants/' + tenantId + '/memberships/' + uid, transaction),
  ]);
  if (!tenant || tenant.id !== tenantId || tenant.status !== 'active') throw new HttpError(404, 'tenant_unavailable');
  if (!membership || membership.tenantId !== tenantId || membership.userId !== uid || !appointmentPermission(membership)) {
    throw new HttpError(403, 'appointment_permission_required');
  }
  if (tenant.planId === 'premium_demo' || tenant.subscriptionStatus === 'demo') throw new HttpError(409, 'demo_read_only');
  if (!canUse(tenant as any, 'agenda')) throw new HttpError(403, 'feature_not_available');
  return { tenant, membership };
}

async function verifyAppointmentReferences(
  env: Env,
  token: string,
  transaction: string,
  tenantId: string,
  candidate: AppointmentWindow,
  patientId: string,
  procedureIds: string[],
) {
  const paths = [
    'tenants/' + tenantId + '/patients/' + patientId,
    'tenants/' + tenantId + '/professionals/' + candidate.professionalId,
    ...(candidate.resourceId ? ['tenants/' + tenantId + '/scheduleResources/' + candidate.resourceId] : []),
    ...procedureIds.map(id => 'tenants/' + tenantId + '/procedures/' + id),
  ];
  const refs = await Promise.all(paths.map(path => getDocument(env, token, path, transaction)));
  const [patient, professional, resource, ...procedures] = refs;
  if (!patient || patient.tenantId !== tenantId || patient.status !== 'active') throw new HttpError(400, 'patient_unavailable');
  if (!professional || professional.tenantId !== tenantId || professional.status !== 'active') throw new HttpError(400, 'professional_unavailable');
  if (candidate.resourceId && (!resource || resource.tenantId !== tenantId || resource.active !== true)) throw new HttpError(400, 'resource_unavailable');
  if (procedures.some(item => !item || item.tenantId !== tenantId || item.active !== true)) throw new HttpError(400, 'procedure_unavailable');
}

async function existingReservations(env: Env, token: string, transaction: string, tenantId: string, window: AppointmentWindow) {
  const start = Date.parse(window.startsAt);
  const lowerBound = new Date(start - MAX_CONFLICT_LOOKBACK_MS).toISOString();
  const upperBound = window.endsAt;
  const parent = 'tenants/' + tenantId;
  const [professionalRows, resourceRows, blockRows] = await Promise.all([
    queryCollection(env, token, parent, 'appointments', [
      { fieldPath: 'professionalId', op: 'EQUAL', value: window.professionalId },
      { fieldPath: 'startsAt', op: 'GREATER_THAN_OR_EQUAL', value: lowerBound },
      { fieldPath: 'startsAt', op: 'LESS_THAN', value: upperBound },
    ], transaction),
    window.resourceId ? queryCollection(env, token, parent, 'appointments', [
      { fieldPath: 'resourceId', op: 'EQUAL', value: window.resourceId },
      { fieldPath: 'startsAt', op: 'GREATER_THAN_OR_EQUAL', value: lowerBound },
      { fieldPath: 'startsAt', op: 'LESS_THAN', value: upperBound },
    ], transaction) : Promise.resolve([]),
    queryCollection(env, token, parent, 'scheduleBlocks', [
      { fieldPath: 'startsAt', op: 'GREATER_THAN_OR_EQUAL', value: lowerBound },
      { fieldPath: 'startsAt', op: 'LESS_THAN', value: upperBound },
    ], transaction),
  ]);
  const unique = new Map<string, FsReservation>();
  for (const row of [...professionalRows, ...resourceRows]) {
    if (row.tenantId !== tenantId || typeof row.startsAt !== 'string' || typeof row.endsAt !== 'string') continue;
    unique.set(row.id, row as FsReservation);
  }
  const blocks = blockRows.filter(row => row.tenantId === tenantId && row.active !== false) as ScheduleBlockWindow[];
  return { reservations: [...unique.values()], blocks };
}

async function readLockDocuments(env: Env, token: string, transaction: string, tenantId: string, paths: string[]) {
  const pairs = await Promise.all(paths.map(async path => [path, await getDocument(env, token, path, transaction)] as const));
  return new Map(pairs);
}

function dateRangeReservations(window: AppointmentWindow, appointmentId: string, status: string): FsReservation {
  return { ...window, id: appointmentId, status };
}

function fsStatus(error: FirestoreError) {
  return error.code === 'ABORTED' || error.code === 'FAILED_PRECONDITION' || error.status === 409 || error.status === 400;
}

async function saveAppointment(env: Env, uid: string, input: Record<string, unknown>) {
  const tenantId = typeof input.tenantId === 'string' ? input.tenantId : '';
  const patientId = typeof input.patientId === 'string' ? input.patientId : '';
  const professionalId = typeof input.professionalId === 'string' ? input.professionalId : '';
  const startsAt = typeof input.startsAt === 'string' ? input.startsAt : '';
  const endsAt = typeof input.endsAt === 'string' ? input.endsAt : '';
  const resourceId = typeof input.resourceId === 'string' && input.resourceId ? input.resourceId : undefined;
  const procedureIds = Array.isArray(input.procedureIds) ? input.procedureIds : [];
  const safeId = (value: string) => /^[A-Za-z0-9_-]{1,128}$/.test(value);
  if (!safeId(tenantId) || !safeId(patientId) || !safeId(professionalId) || (resourceId && !safeId(resourceId))
    || !Array.isArray(input.procedureIds)
    || procedureIds.length > 10 || procedureIds.some(id => typeof id !== 'string' || !id)
    || new Set(procedureIds).size !== procedureIds.length
    || procedureIds.some(id => !safeId(id))
    || (input.appointmentId !== undefined && (typeof input.appointmentId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(input.appointmentId)))) {
    throw new HttpError(400, 'invalid_payload');
  }
  const candidate: AppointmentWindow = { startsAt, endsAt, professionalId, resourceId };
  if (!isValidAppointmentWindow(candidate)) throw new HttpError(400, 'invalid_time_range');
  const requestedStatus = input.status === 'pending' ? 'pending' : 'confirmed';
  const appointmentId = typeof input.appointmentId === 'string' ? input.appointmentId : crypto.randomUUID();
  const token = await serviceAccountToken(env);

  for (let attempt = 0; attempt < 5; attempt++) {
    const transaction = await beginTransaction(env, token);
    try {
      const { membership } = await verifyAppointmentAccess(env, token, transaction, uid, tenantId);
      const oldAppointment = input.appointmentId
        ? await getDocument(env, token, 'tenants/' + tenantId + '/appointments/' + appointmentId, transaction)
        : null;
      if (input.appointmentId && (!oldAppointment || oldAppointment.tenantId !== tenantId
        || ['cancelled','no_show','completed'].includes(oldAppointment.status))) {
        throw new HttpError(404, 'appointment_unavailable');
      }
      if (!oldAppointment) {
        const tenant = await getDocument(env, token, 'tenants/' + tenantId, transaction);
        if (!tenant || !canCreateCommercialCapacity(tenant as any)) throw new HttpError(403, 'commercial_status_blocks_new_capacity');
      }
      await verifyAppointmentReferences(env, token, transaction, tenantId, candidate, patientId, procedureIds as string[]);

      const { reservations, blocks } = await existingReservations(env, token, transaction, tenantId, candidate);
      const oldWindow = oldAppointment ? {
        professionalId: String(oldAppointment.professionalId),
        resourceId: typeof oldAppointment.resourceId === 'string' ? oldAppointment.resourceId : undefined,
        startsAt: String(oldAppointment.startsAt),
        endsAt: String(oldAppointment.endsAt),
      } : null;
      const oldLocks = oldWindow ? scheduleLockIds(oldWindow) : [];
      const newLocks = scheduleLockIds(candidate);
      const allLockIds = [...new Set([...oldLocks, ...newLocks])];
      const lockPaths = allLockIds.map(id => 'tenants/' + tenantId + '/scheduleLocks/' + id);
      const lockDocs = await readLockDocuments(env, token, transaction, tenantId, lockPaths);
      const lockedReservations = new Map<string, FsReservation>();
      for (const lock of lockDocs.values()) {
        if (!lock || lock.tenantId !== tenantId || !Array.isArray(lock.reservations)) continue;
        for (const item of lock.reservations as FsReservation[]) if (item && typeof item.id === 'string') lockedReservations.set(item.id, item);
      }

      const currentStatuses = new Map(reservations.map(item => [item.id, item.status]));
      const lockOnly = [...lockedReservations.values()].map(item => ({
        ...item,
        status: currentStatuses.get(item.id) ?? item.status,
      }));
      const conflict = findScheduleConflict(candidate, [
        ...reservations,
        ...lockOnly,
      ], blocks, appointmentId);
      if (conflict) {
        await rollbackTransaction(env, token, transaction);
        throw new HttpError(409, 'schedule_conflict_' + conflict);
      }

      const nextStatus = oldAppointment ? String(oldAppointment.status) : requestedStatus;
      const nextReservation = dateRangeReservations(candidate, appointmentId, nextStatus);
      const writes: unknown[] = [];
      for (const [path, current] of lockDocs) {
        const id = path.split('/').at(-1)!;
        const reservationsForLock = Array.isArray(current?.reservations) ? current.reservations as FsReservation[] : [];
        const updated = reservationsForLock.filter(item => item.id !== appointmentId);
        if (newLocks.includes(id)) updated.push(nextReservation);
        writes.push(documentWrite(env, path, {
          tenantId, id, reservations: updated, updatedAt: new Date(),
        }, !current));
      }

      const appointmentPath = 'tenants/' + tenantId + '/appointments/' + appointmentId;
      const now = new Date();
      const appointmentData: Record<string, unknown> = {
        id: appointmentId, tenantId, patientId, professionalId, startsAt, endsAt,
        procedureIds, status: nextStatus, resourceId,
        notes: oldAppointment?.notes,
        createdAt: oldAppointment?.createdAt ? new Date(String(oldAppointment.createdAt)) : now,
        updatedAt: now, createdBy: oldAppointment?.createdBy ?? uid, updatedBy: uid,
      };
      writes.push(documentWrite(env, appointmentPath, appointmentData, !oldAppointment));
      const auditId = crypto.randomUUID();
      writes.push(documentWrite(env, 'tenants/' + tenantId + '/auditLogs/' + auditId, {
        tenantId,
        actorId: uid,
        actorRole: membership.role,
        action: oldAppointment ? 'appointment.reschedule' : 'appointment.create',
        resourceType: 'appointment',
        resourceId: appointmentId,
        timestamp: now,
      }, true));
      await commitTransaction(env, token, transaction, writes);
      return { ...appointmentData, id: appointmentId };
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 409)) await rollbackTransaction(env, token, transaction);
      if (error instanceof FirestoreError && fsStatus(error) && attempt < 4) continue;
      if (error instanceof HttpError) throw error;
      if (error instanceof FirestoreError) throw new HttpError(error.status === 400 ? 409 : 503, 'firestore_transaction_failed');
      throw new HttpError(503, 'appointment_save_failed');
    }
  }
  throw new HttpError(409, 'schedule_changed_retry');
}

async function cancelAppointment(env: Env, uid: string, tenantId: string, appointmentId: string) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(tenantId) || !/^[A-Za-z0-9_-]{1,128}$/.test(appointmentId)) {
    throw new HttpError(400, 'invalid_payload');
  }
  const token = await serviceAccountToken(env);
  for (let attempt = 0; attempt < 5; attempt++) {
    const transaction = await beginTransaction(env, token);
    try {
      const { membership } = await verifyAppointmentAccess(env, token, transaction, uid, tenantId);
      const appointmentPath = 'tenants/' + tenantId + '/appointments/' + appointmentId;
      const appointment = await getDocument(env, token, appointmentPath, transaction);
      if (!appointment || appointment.tenantId !== tenantId) throw new HttpError(404, 'appointment_unavailable');
      if (appointment.status === 'cancelled') {
        await rollbackTransaction(env, token, transaction);
        return { id: appointmentId, status: 'cancelled' };
      }
      if (['completed','no_show'].includes(String(appointment.status))) throw new HttpError(409, 'appointment_already_closed');
      const window: AppointmentWindow = {
        professionalId: String(appointment.professionalId),
        resourceId: typeof appointment.resourceId === 'string' ? appointment.resourceId : undefined,
        startsAt: String(appointment.startsAt),
        endsAt: String(appointment.endsAt),
      };
      const lockPaths = scheduleLockIds(window).map(id => 'tenants/' + tenantId + '/scheduleLocks/' + id);
      const lockDocs = await readLockDocuments(env, token, transaction, tenantId, lockPaths);
      const writes: unknown[] = [];
      for (const [path, current] of lockDocs) {
        if (!current || current.tenantId !== tenantId || !Array.isArray(current.reservations)) continue;
        writes.push(documentWrite(env, path, {
          ...current,
          reservations: current.reservations.filter((item: FsReservation) => item.id !== appointmentId),
          updatedAt: new Date(),
        }));
      }
      const now = new Date();
      writes.push(documentWrite(env, appointmentPath, { ...appointment, status: 'cancelled', updatedAt: now, updatedBy: uid }));
      const auditId = crypto.randomUUID();
      writes.push(documentWrite(env, 'tenants/' + tenantId + '/auditLogs/' + auditId, {
        tenantId, actorId: uid, actorRole: membership.role,
        action: 'appointment.cancel', resourceType: 'appointment', resourceId: appointmentId, timestamp: now,
      }, true));
      await commitTransaction(env, token, transaction, writes);
      return { id: appointmentId, status: 'cancelled' };
    } catch (error) {
      await rollbackTransaction(env, token, transaction);
      if (error instanceof FirestoreError && fsStatus(error) && attempt < 4) continue;
      if (error instanceof HttpError) throw error;
      if (error instanceof FirestoreError) throw new HttpError(error.status === 400 ? 409 : 503, 'firestore_transaction_failed');
      throw new HttpError(503, 'appointment_cancel_failed');
    }
  }
  throw new HttpError(409, 'schedule_changed_retry');
}

function hasRolePermission(membership: Record<string, any>, permission: string) {
  const role = membership.role;
  const permissions = Array.isArray(membership.permissions) ? membership.permissions as string[] : [];
  const rolePermissions: Record<string, string[]> = {
    tenant_owner: ['tenant.manage','memberships.read','memberships.manage','professionals.read','professionals.manage','patients.read','patients.manage','appointments.read','appointments.manage','resources.read','resources.manage','recalls.read','recalls.manage','intake.read','intake.manage','procedures.read','procedures.manage','billing.read','billing.write','usage.read','audit.read'],
    tenant_admin: ['memberships.read','professionals.read','professionals.manage','patients.read','patients.manage','appointments.read','appointments.manage','resources.read','resources.manage','recalls.read','recalls.manage','intake.read','intake.manage','procedures.read','procedures.manage','billing.read','billing.write'],
    dentist: ['professionals.read','patients.read','appointments.read','appointments.manage','procedures.read','clinical.read','clinical.write','treatment.read','treatment.write','recalls.read','recalls.manage','resources.read'],
    receptionist: ['professionals.read','patients.read','patients.manage','appointments.read','appointments.manage','procedures.read','resources.read','recalls.read','recalls.manage','intake.read','intake.manage','billing.read','billing.write'],
    assistant: ['professionals.read','patients.read','appointments.read','procedures.read','resources.read'],
  };
  return membership.status === 'active' && permissions.includes(permission) && (rolePermissions[role] ?? []).includes(permission);
}

function permissionsForRole(role: string) {
  const rolePermissions: Record<string, string[]> = {
    tenant_owner: ['tenant.manage','memberships.read','memberships.manage','professionals.read','professionals.manage','patients.read','patients.manage','appointments.read','appointments.manage','resources.read','resources.manage','recalls.read','recalls.manage','intake.read','intake.manage','procedures.read','procedures.manage','billing.read','billing.write','usage.read','audit.read'],
    tenant_admin: ['memberships.read','professionals.read','professionals.manage','patients.read','patients.manage','appointments.read','appointments.manage','resources.read','resources.manage','recalls.read','recalls.manage','intake.read','intake.manage','procedures.read','procedures.manage','billing.read','billing.write'],
    dentist: ['professionals.read','patients.read','appointments.read','appointments.manage','procedures.read','clinical.read','clinical.write','treatment.read','treatment.write','recalls.read','recalls.manage','resources.read'],
    receptionist: ['professionals.read','patients.read','patients.manage','appointments.read','appointments.manage','procedures.read','resources.read','recalls.read','recalls.manage','intake.read','intake.manage','billing.read','billing.write'],
    assistant: ['professionals.read','patients.read','appointments.read','procedures.read','resources.read'],
  };
  return rolePermissions[role] ?? null;
}

type CapacityKind = 'professionals' | 'resources' | 'memberships';

function capacityCollection(kind: CapacityKind) {
  return kind === 'professionals' ? 'professionals' : kind === 'resources' ? 'scheduleResources' : 'memberships';
}

function capacityLimitKey(kind: CapacityKind) {
  return kind === 'memberships' ? 'adminUsers' : kind;
}

function activeCapacityRows(kind: CapacityKind, rows: Record<string, any>[]) {
  return rows.filter(row => row.status === 'active' || (kind === 'resources' && row.active === true))
    .filter(row => kind !== 'memberships' || row.role !== 'tenant_owner');
}

function countDelta(kind: CapacityKind, before: Record<string, any> | null, after: Record<string, any> | null) {
  const counted = (row: Record<string, any> | null) => !!row && (kind === 'resources' ? row.active === true : row.status === 'active')
    && (kind !== 'memberships' || row.role !== 'tenant_owner');
  return Number(counted(after)) - Number(counted(before));
}

function safeId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9:_-]{1,128}$/.test(value);
}

async function mutateCapacity(env: Env, uid: string, input: Record<string, unknown>) {
  const tenantId = typeof input.tenantId === 'string' ? input.tenantId : '';
  const kind = input.kind as CapacityKind;
  const operation = typeof input.operation === 'string' ? input.operation : '';
  const recordIdInput = typeof input.recordId === 'string' ? input.recordId : '';
  const allowedKinds: CapacityKind[] = ['professionals', 'resources', 'memberships'];
  const allowedOperations = ['create', 'activate', 'deactivate', 'update'];
  if (!safeId(tenantId) || !allowedKinds.includes(kind) || !allowedOperations.includes(operation)
    || (operation !== 'create' && !safeId(recordIdInput))) throw new HttpError(400, 'invalid_payload');
  const values = input.values && typeof input.values === 'object' && !Array.isArray(input.values)
    ? input.values as Record<string, unknown> : {};
  const token = await serviceAccountToken(env);
  for (let attempt = 0; attempt < 5; attempt++) {
    const transaction = await beginTransaction(env, token);
    try {
      const [tenant, membership] = await Promise.all([
        getDocument(env, token, 'tenants/' + tenantId, transaction),
        getDocument(env, token, 'tenants/' + tenantId + '/memberships/' + uid, transaction),
      ]);
      if (!tenant || tenant.id !== tenantId || tenant.status !== 'active') throw new HttpError(404, 'tenant_unavailable');
      if (tenant.planId === 'premium_demo' || tenant.subscriptionStatus === 'demo') throw new HttpError(409, 'demo_read_only');
      const requiredPermission = kind === 'memberships' ? 'memberships.manage' : kind === 'professionals' ? 'professionals.manage' : 'resources.manage';
      if (!membership || membership.tenantId !== tenantId || membership.userId !== uid || !hasRolePermission(membership, requiredPermission)) {
        throw new HttpError(403, 'capacity_permission_required');
      }
      const collectionId = capacityCollection(kind);
      const recordId = operation === 'create' && kind !== 'memberships' ? crypto.randomUUID() : recordIdInput;
      if (!safeId(recordId)) throw new HttpError(400, 'invalid_payload');
      const recordPath = 'tenants/' + tenantId + '/' + collectionId + '/' + recordId;
      const before = operation === 'create' && kind !== 'memberships' ? null : await getDocument(env, token, recordPath, transaction);
      if (operation !== 'create' && (!before || before.tenantId !== tenantId)) throw new HttpError(404, 'capacity_record_unavailable');
      if (operation === 'create' && before) throw new HttpError(409, 'capacity_record_exists');

      let after: Record<string, any>;
      if (kind === 'professionals') {
        const status = operation === 'deactivate' ? 'inactive' : operation === 'activate' ? 'active' : before?.status ?? 'active';
        const displayName = operation === 'create' ? values.displayName : before?.displayName;
        const specialty = operation === 'create' ? values.specialty : before?.specialty;
        if (operation === 'create' && (typeof displayName !== 'string' || !displayName.trim() || displayName.length > 160
          || (specialty !== undefined && (typeof specialty !== 'string' || specialty.length > 120)))) throw new HttpError(400, 'invalid_professional');
        after = { ...before, id: recordId, tenantId, displayName, specialty: typeof specialty === 'string' ? specialty : '', status };
      } else if (kind === 'resources') {
        const active = operation === 'deactivate' ? false : operation === 'activate' ? true : before?.active ?? true;
        const name = operation === 'create' ? values.name : before?.name;
        const type = operation === 'create' ? values.type : before?.type;
        if (operation === 'create' && (typeof name !== 'string' || !name.trim() || name.length > 100
          || !['chair','room','equipment'].includes(String(type)))) throw new HttpError(400, 'invalid_resource');
        after = { ...before, id: recordId, tenantId, name, type, active };
      } else {
        const role = operation === 'create' || operation === 'update' ? values.role : before?.role;
        const status = operation === 'deactivate' ? 'inactive' : operation === 'activate' ? 'active'
          : operation === 'create' ? 'active' : values.status === 'active' || values.status === 'inactive' ? values.status : before?.status;
        if (recordId === uid || !['tenant_owner','tenant_admin','dentist','receptionist','assistant'].includes(String(role))) throw new HttpError(400, 'invalid_membership');
        if (role === 'tenant_owner') {
          const [owner, platformOwner] = await Promise.all([
            getDocument(env, token, 'tenants/' + tenantId + '/memberships/' + uid, transaction),
            getDocument(env, token, 'platformOwners/' + uid, transaction),
          ]);
          if (owner?.role !== 'tenant_owner' && platformOwner?.status !== 'active') throw new HttpError(403, 'owner_role_assignment_restricted');
        }
        const permissions = permissionsForRole(String(role));
        if (!permissions) throw new HttpError(400, 'invalid_membership');
        after = { ...before, id: recordId, tenantId, userId: recordId, role, status, permissions };
      }
      if (!['create','activate','deactivate','update'].includes(operation)) throw new HttpError(400, 'invalid_operation');
      const delta = countDelta(kind, before, after);
      if (delta > 0) {
        if (!canCreateCommercialCapacity(tenant as any)) throw new HttpError(403, 'commercial_status_blocks_new_capacity');
        if (kind === 'professionals' && !canUse(tenant as any, 'professionals')) throw new HttpError(403, 'feature_not_available');
        if (kind === 'resources' && !canUse(tenant as any, 'physical_resources')) throw new HttpError(403, 'feature_not_available');
      }
      const counterPath = 'tenants/' + tenantId + '/limitCounters/' + kind;
      const counter = await getDocument(env, token, counterPath, transaction);
      let count: number | null;
      if (counter) {
        if (counter.tenantId !== tenantId || counter.kind !== kind || !Number.isInteger(counter.count) || counter.count < 0) throw new HttpError(503, 'capacity_counter_invalid');
        count = counter.count;
      } else if (delta > 0) {
        const rows = await queryCollection(env, token, 'tenants/' + tenantId, collectionId,
          [{ fieldPath: kind === 'resources' ? 'active' : 'status', op: 'EQUAL', value: kind === 'resources' ? true : 'active' }], transaction);
        count = activeCapacityRows(kind, rows).length;
      } else {
        // A downgrade/inactivation must remain possible even before a counter has been initialized.
        count = null;
      }
      let limit: number | null;
      try { limit = delta > 0 ? getLimit(tenant as any, capacityLimitKey(kind) as any) : null; }
      catch { throw new HttpError(503, 'plan_limit_unavailable'); }
      if (limit !== null && (!Number.isFinite(limit) || limit < 0)) throw new HttpError(503, 'plan_limit_unavailable');
      if (delta > 0 && limit !== null && count !== null && count + delta > limit) throw new HttpError(409, 'commercial_limit_reached');
      const now = new Date();
      const auditId = crypto.randomUUID();
      after.lastAuditLogId = auditId;
      after.updatedAt = now;
      if (operation === 'create') { after.createdAt = now; after.createdBy = uid; }
      const action = kind === 'professionals'
        ? operation === 'create' ? 'professional.create' : operation === 'deactivate' ? 'professional.deactivate' : operation === 'activate' ? 'professional.activate' : 'professional.update'
        : kind === 'resources'
          ? operation === 'create' ? 'resource.create' : operation === 'deactivate' ? 'resource.deactivate' : operation === 'activate' ? 'resource.activate' : 'resource.update'
          : operation === 'create' ? 'membership.create' : 'membership.update';
      const updatedCounter = count === null ? null : { tenantId, kind, count: Math.max(0, count + delta), updatedAt: now };
      const writes: unknown[] = [
        ...(updatedCounter ? [documentWrite(env, counterPath, updatedCounter, !counter)] : []),
        documentWrite(env, recordPath, after, operation === 'create'),
        documentWrite(env, 'tenants/' + tenantId + '/auditLogs/' + auditId, {
          tenantId, actorId: uid, actorRole: membership.role, action,
          resourceType: kind === 'professionals' ? 'professional' : kind === 'resources' ? 'scheduleResource' : 'membership',
          resourceId: recordId, timestamp: now,
        }, true),
      ];
      await commitTransaction(env, token, transaction, writes);
      return { id: recordId, count: updatedCounter?.count ?? null, limit };
    } catch (error) {
      await rollbackTransaction(env, token, transaction);
      if (error instanceof FirestoreError && fsStatus(error) && attempt < 4) continue;
      if (error instanceof HttpError) throw error;
      if (error instanceof FirestoreError) throw new HttpError(error.status === 400 ? 409 : 503, 'firestore_transaction_failed');
      throw new HttpError(503, 'capacity_update_failed');
    }
  }
  throw new HttpError(409, 'capacity_changed_retry');
}

interface ClinicalAccess {
  tenant: Record<string, any>;
  membership: Record<string, any> | null;
  actorRole: string;
}

async function verifyClinicalAccess(
  env: Env, token: string, uid: string, tenantId: string, patientId: string, permission: 'clinical.read' | 'clinical.write',
  transaction?: string,
): Promise<ClinicalAccess> {
  const paths = [
    'tenants/' + tenantId,
    'tenants/' + tenantId + '/memberships/' + uid,
    'tenants/' + tenantId + '/patients/' + patientId,
    'platformOwners/' + uid,
    'platformSupportAccess/' + tenantId,
  ];
  const docs = await Promise.all(paths.map(path => getDocument(env, token, path, transaction)));
  const [tenant, membership, patient, owner, support] = docs;
  if (!tenant || tenant.id !== tenantId || tenant.status !== 'active') throw new HttpError(404, 'tenant_unavailable');
  if (!patient || patient.tenantId !== tenantId || patient.id !== patientId) throw new HttpError(404, 'patient_unavailable');
  if (permission === 'clinical.write' && patient.status !== 'active') throw new HttpError(409, 'patient_inactive');
  if (membership && membership.tenantId === tenantId && membership.userId === uid && hasRolePermission(membership, permission)) {
    return { tenant, membership, actorRole: membership.role };
  }
  const supportExpiry = support?.expiresAt ? Date.parse(String(support.expiresAt)) : NaN;
  const hasSupport = owner?.status === 'active'
    && support && support.tenantId === tenantId && support.actorId === uid
    && typeof support.reason === 'string' && support.reason.trim().length >= 12
    && Number.isFinite(supportExpiry) && supportExpiry > Date.now() && !support.revokedAt;
  if (hasSupport) return { tenant, membership: null, actorRole: 'platform_owner' };
  throw new HttpError(403, 'clinical_permission_required');
}

function imageType(file: File) {
  if (file.type !== 'image/jpeg' && file.type !== 'image/png' && file.type !== 'image/webp') return null;
  return file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
}

async function validImageBytes(file: File, contentType: string) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (contentType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === 'image/png') return bytes.length >= 8
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  return bytes.length >= 12
    && new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF'
    && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
}

function fileLabel(extension: string, id: string) {
  return 'clinical-image-' + id + '.' + extension;
}

function isFileEntry(value: string | File | null): value is File {
  return value !== null && typeof value === 'object'
    && 'size' in value && 'type' in value && 'stream' in value && 'slice' in value;
}

async function uploadMedia(request: Request, env: Env, uid: string) {
  const contentLength = Number(request.headers.get('Content-Length') ?? 0);
  if (contentLength > MAX_MEDIA_BYTES + 128 * 1024) throw new HttpError(413, 'file_too_large');
  const form = await request.formData();
  const tenantId = String(form.get('tenantId') ?? '');
  const patientId = String(form.get('patientId') ?? '');
  const file = form.get('file');
  if (!tenantId || !patientId || !isFileEntry(file)) throw new HttpError(400, 'invalid_payload');
  if (file.size < 1 || file.size > MAX_MEDIA_BYTES) throw new HttpError(413, 'file_too_large');
  const extension = imageType(file);
  if (!extension || !await validImageBytes(file, file.type)) throw new HttpError(415, 'unsupported_image_type');

  const token = await serviceAccountToken(env);
  const access = await verifyClinicalAccess(env, token, uid, tenantId, patientId, 'clinical.write');
  if (!canUse(access.tenant as any, 'clinical_photos')) throw new HttpError(403, 'feature_not_available');
  if (access.tenant.planId === 'premium_demo' || access.tenant.subscriptionStatus === 'demo') throw new HttpError(409, 'demo_read_only');
  const id = crypto.randomUUID();
  const objectKey = 'tenants/' + tenantId + '/patients/' + patientId + '/' + id + '.' + extension;
  await env.CLINICAL_MEDIA.put(objectKey, file.stream(), {
    httpMetadata: { contentType: file.type, cacheControl: 'private, no-store' },
    customMetadata: { tenantId, patientId, uploaderId: uid },
  });

  const transaction = await beginTransaction(env, token);
  try {
    const access = await verifyClinicalAccess(env, token, uid, tenantId, patientId, 'clinical.write', transaction);
    const photoPath = 'tenants/' + tenantId + '/patients/' + patientId + '/clinicalPhotos/' + id;
    const photo = {
      id, tenantId, patientId, objectKey, r2ObjectKey: objectKey,
      capturedAt: new Date(), createdAt: new Date(), createdBy: uid, uploaderId: uid,
      status: 'unverified', region: '', teeth: [], tags: [], contentType: file.type,
      originalName: fileLabel(extension, id), auditLogId: id,
    };
    const audit = {
      tenantId, actorId: uid, actorRole: access.actorRole, action: 'clinical_photo.upload',
      resourceType: 'clinicalPhoto', resourceId: id, timestamp: new Date(), patientId,
    };
    await commitTransaction(env, token, transaction, [
      documentWrite(env, photoPath, photo, true),
      documentWrite(env, 'tenants/' + tenantId + '/auditLogs/' + id, audit, true),
    ]);
    return { photoId: id, objectKey };
  } catch (error) {
    await rollbackTransaction(env, token, transaction);
    await env.CLINICAL_MEDIA.delete(objectKey).catch(() => undefined);
    throw error;
  }
}

async function downloadMedia(request: Request, env: Env, uid: string, photoId: string) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenantId') ?? '';
  const patientId = url.searchParams.get('patientId') ?? '';
  if (!tenantId || !patientId || !/^[A-Za-z0-9_-]{1,128}$/.test(photoId)) throw new HttpError(400, 'invalid_payload');
  const token = await serviceAccountToken(env);
  await verifyClinicalAccess(env, token, uid, tenantId, patientId, 'clinical.read');
  const photo = await getDocument(env, token, 'tenants/' + tenantId + '/patients/' + patientId + '/clinicalPhotos/' + photoId);
  if (!photo || photo.tenantId !== tenantId || photo.patientId !== patientId
    || typeof photo.objectKey !== 'string' || !photo.objectKey.startsWith('tenants/' + tenantId + '/patients/' + patientId + '/')) {
    throw new HttpError(404, 'media_unavailable');
  }
  const object = await env.CLINICAL_MEDIA.get(photo.objectKey);
  if (!object) throw new HttpError(404, 'media_unavailable');
  return response(request, env, 200, object.body, {
    'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': 'inline; filename="clinical-image"',
  });
}

async function handle(request: Request, env: Env) {
  validateOrigin(request, env);
  if (request.method === 'OPTIONS') return response(request, env, 204, null);
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/health') return json(request, env, 200, { ok: true });

  const user = await authenticate(request, env);
  if (request.method === 'POST' && url.pathname === '/v1/tenants/capacity') {
    let payload: Record<string, unknown>;
    try { payload = await request.json() as Record<string, unknown>; }
    catch { throw new HttpError(400, 'invalid_json'); }
    const result = await mutateCapacity(env, user.uid, payload);
    return json(request, env, 200, result);
  }
  if (request.method === 'POST' && url.pathname === '/v1/appointments') {
    let payload: Record<string, unknown>;
    try { payload = await request.json() as Record<string, unknown>; }
    catch { throw new HttpError(400, 'invalid_json'); }
    const appointment = await saveAppointment(env, user.uid, payload);
    return json(request, env, 200, appointment);
  }

  const cancelMatch = url.pathname.match(/^\/v1\/appointments\/([A-Za-z0-9_-]{1,128})\/cancel$/);
  if (request.method === 'POST' && cancelMatch) {
    const tenantId = url.searchParams.get('tenantId') ?? '';
    const result = await cancelAppointment(env, user.uid, tenantId, cancelMatch[1]);
    return json(request, env, 200, result);
  }

  if (request.method === 'POST' && url.pathname === '/v1/media') {
    const uploaded = await uploadMedia(request, env, user.uid);
    return json(request, env, 201, uploaded);
  }

  const mediaMatch = url.pathname.match(/^\/v1\/media\/([A-Za-z0-9_-]{1,128})$/);
  if (request.method === 'GET' && mediaMatch) return await downloadMedia(request, env, user.uid, mediaMatch[1]);
  throw new HttpError(404, 'not_found');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handle(request, env);
    } catch (error) {
      if (error instanceof HttpError) {
        const status = error.status;
        return json(request, env, status, { error: error.message });
      }
      if (error instanceof FirestoreError) {
        return json(request, env, error.status === 403 ? 403 : 503, { error: 'firestore_operation_failed' });
      }
      return json(request, env, 500, { error: 'internal_error' });
    }
  },
};
