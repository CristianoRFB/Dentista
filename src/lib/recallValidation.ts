import { canUse } from '../commercial/entitlementService';
import type { RecallStatus } from '../domain/types';
import type { TenantAccessState } from '../modules/tenant/tenantResolver';
import { requirePermission, requireReady } from './tenantDataCore';

export const RECALL_STATUSES = ['planned', 'due', 'contacted', 'scheduled', 'dismissed'] as const satisfies readonly RecallStatus[];

export function validateRecallForm(input: { patientId: string; reason: string; dueAt: string }) {
  const patientId = input.patientId.trim();
  const reason = input.reason.trim();
  if (!/^[A-Za-z0-9:_-]{1,128}$/.test(patientId)) throw new Error('Selecione um paciente válido.');
  if (reason.length < 3 || reason.length > 500) throw new Error('O motivo deve conter de 3 a 500 caracteres.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueAt)) throw new Error('Informe uma data válida.');
  const date = new Date(input.dueAt + 'T12:00:00.000Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input.dueAt) throw new Error('Informe uma data válida.');
  return { patientId, reason, dueAt: input.dueAt + 'T12:00:00.000Z' };
}

export function validateRecallTransition(previous: RecallStatus, next: RecallStatus, appointmentId?: string) {
  if (!RECALL_STATUSES.includes(next)) throw new Error('Estado inválido.');
  if (previous === 'dismissed' && next !== 'dismissed') throw new Error('Um retorno encerrado não pode ser reaberto sem novo registro.');
  if (next === 'scheduled' && !appointmentId) throw new Error('Associe um agendamento real ao marcar como agendado.');
}

export function canManageRecalls(session: TenantAccessState) {
  if (session.status !== 'ready' || session.isDemo) return false;
  return session.permissions.includes('recalls.manage') && canUse(session.tenant, 'recall_center');
}

export function requireRecallAccess(session: TenantAccessState, writing: boolean) {
  const ready = requireReady(session);
  requirePermission(ready, writing ? 'recalls.manage' : 'recalls.read');
  if (!canUse(ready.tenant, 'recall_center')) throw new Error('Central de Retorno disponível apenas nos planos habilitados.');
  return ready;
}
