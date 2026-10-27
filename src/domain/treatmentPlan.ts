import { TOOTH_IDS } from './odontogram';

export const TREATMENT_STATUSES = ['draft','approved','in_progress','completed','cancelled'] as const;
export type TreatmentStatus = typeof TREATMENT_STATUSES[number];
export const TREATMENT_ITEM_STAGES = ['planned','in_progress','completed','cancelled'] as const;
export type TreatmentItemStage = typeof TREATMENT_ITEM_STAGES[number];

export interface TreatmentItem {
  procedureId: string;
  description: string;
  toothId: string;
  stage: TreatmentItemStage;
  quantity: number;
  unitPriceCents: number;
}
export interface TreatmentPlan {
  id: string;
  tenantId: string;
  patientId: string;
  professionalId: string;
  currentVersion: number;
  status: TreatmentStatus;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  lastAuditLogId: string;
}
export interface TreatmentPlanVersion {
  id: string;
  planId: string;
  tenantId: string;
  patientId: string;
  version: number;
  status: TreatmentStatus;
  items: TreatmentItem[];
  quoteEnabled: boolean;
  note: string;
  appointmentId: string;
  createdBy: string;
  createdAt: string;
  auditLogId: string;
}

const ID = /^[A-Za-z0-9:_-]{1,128}$/;
export const MAX_TREATMENT_ITEMS = 12;

export function validateTreatmentVersion(input: {
  items: TreatmentItem[]; note: string; quoteEnabled: boolean; appointmentId?: string;
}) {
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > MAX_TREATMENT_ITEMS) {
    throw new Error('Informe de 1 a 12 procedimentos no plano.');
  }
  if (typeof input.note !== 'string' || input.note.trim().length > 2000) throw new Error('Observação excede 2.000 caracteres.');
  if (typeof input.quoteEnabled !== 'boolean') throw new Error('Modo de orçamento inválido.');
  if (input.appointmentId && !ID.test(input.appointmentId)) throw new Error('Agendamento inválido.');
  const items = input.items.map(item => {
    if (!item || !ID.test(item.procedureId) || typeof item.description !== 'string'
        || item.description.trim().length < 3 || item.description.trim().length > 160
        || (item.toothId !== '' && !TOOTH_IDS.includes(item.toothId as typeof TOOTH_IDS[number]))
        || !TREATMENT_ITEM_STAGES.includes(item.stage)
        || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20
        || !Number.isSafeInteger(item.unitPriceCents) || item.unitPriceCents < 0 || item.unitPriceCents > 100_000_000
        || (!input.quoteEnabled && item.unitPriceCents !== 0)) throw new Error('Procedimento inválido no plano.');
    return { procedureId: item.procedureId, description: item.description.trim(), toothId: item.toothId,
      stage: item.stage, quantity: item.quantity, unitPriceCents: item.unitPriceCents };
  });
  return { items, note: input.note.trim(), quoteEnabled: input.quoteEnabled, appointmentId: input.appointmentId ?? '' };
}

export function treatmentTotalCents(items: readonly TreatmentItem[], quoteEnabled: boolean): number | null {
  if (!quoteEnabled) return null;
  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
  if (!Number.isSafeInteger(total)) throw new Error('Total do orçamento excedeu a capacidade permitida.');
  return total;
}

export function canTransitionTreatment(from: TreatmentStatus, to: TreatmentStatus): boolean {
  if (from === to) return true;
  const next: Record<TreatmentStatus, readonly TreatmentStatus[]> = {
    draft: ['approved','cancelled'], approved: ['in_progress','cancelled'],
    in_progress: ['completed','cancelled'], completed: [], cancelled: [],
  };
  return next[from].includes(to);
}

export function planVersionId(version: number) {
  if (!Number.isSafeInteger(version) || version < 1 || version > 99999) throw new Error('Versão inválida.');
  return 'v' + String(version).padStart(5, '0');
}
