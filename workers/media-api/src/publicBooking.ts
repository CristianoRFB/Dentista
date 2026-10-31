import { intakeTokenHash, createIntakeSecret } from './intakeValidation';
export { createIntakeSecret, intakeTokenHash };
const ID = /^[A-Za-z0-9_-]{1,128}$/;
export const BOOKING_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_BOOKING_AHEAD_MS = 60 * 24 * 60 * 60 * 1000;
export const BOOKING_DURATIONS = [30,60] as const;

export function validateBookingInvite(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid_invite');
  const body=input as Record<string,unknown>;
  if(Object.keys(body).some(k=>!['tenantId','patientId','professionalId','procedureId','resourceId','durationMinutes'].includes(k)))throw new Error('invalid_invite');
  const values = ['tenantId','patientId','professionalId','procedureId'] as const;
  for(const key of values) if(typeof body[key]!=='string'||!ID.test(body[key] as string))throw new Error('invalid_invite');
  if (body.resourceId !== undefined && (typeof body.resourceId!=='string'||!ID.test(body.resourceId))) throw new Error('invalid_invite');
  if(!BOOKING_DURATIONS.includes(body.durationMinutes as 30|60))throw new Error('invalid_invite');
  return {
    tenantId:body.tenantId as string, patientId:body.patientId as string,
    professionalId:body.professionalId as string, procedureId:body.procedureId as string,
    resourceId:body.resourceId as string|undefined, durationMinutes:body.durationMinutes as 30|60,
  };
}

export function validatePublicBooking(input: unknown, now=Date.now()) {
  if (!input || typeof input !== 'object' || Array.isArray(input))throw new Error('invalid_booking');
  const body=input as Record<string,unknown>;
  if(Object.keys(body).some(k=>!['tenantSlug','token','startsAt'].includes(k)))throw new Error('invalid_booking');
  const tenantSlug=body.tenantSlug;
  const token=body.token;
  const startsAt=body.startsAt;
  if(typeof tenantSlug!=='string'||!/^[a-z0-9](?:[a-z0-9-]{0,60}[a-z0-9])?$/.test(tenantSlug)
    ||typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token)
    ||typeof startsAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(startsAt))throw new Error('invalid_booking');
  const time=Date.parse(startsAt);
  if(!Number.isFinite(time)||new Date(time).toISOString()!==startsAt||time < now + 5*60*1000||time>now+MAX_BOOKING_AHEAD_MS)throw new Error('invalid_booking');
  return {tenantSlug,token,startsAt};
}
