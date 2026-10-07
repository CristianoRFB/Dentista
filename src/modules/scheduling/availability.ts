import type { Appointment } from '../../domain/types';

export interface TimeRange { start: number; end: number; }
export interface ScheduleCandidate extends TimeRange { professionalId: string; resourceId?: string; }
export interface ExistingReservation extends ScheduleCandidate { status?: string; }

export function overlaps(a: TimeRange, b: TimeRange) {
  return a.start < b.end && b.start < a.end;
}

export function canSchedule(candidate: TimeRange, existing: TimeRange[], blocks: TimeRange[] = []) {
  return !existing.some(x => overlaps(candidate, x)) && !blocks.some(x => overlaps(candidate, x));
}

/**
 * Validação de domínio pura para conflitos relevantes de agenda.
 * Em produção a mesma regra precisa ser repetida de forma transacional/confiável
 * no backend/Firestore para impedir corrida entre dois agendamentos simultâneos.
 */
export function findScheduleConflict(candidate: ScheduleCandidate, existing: ExistingReservation[], blocks: TimeRange[] = []) {
  if (blocks.some(block => overlaps(candidate, block))) return 'blocked' as const;
  const active = existing.filter(x => !['cancelled','no_show'].includes(x.status ?? ''));
  if (active.some(x => x.professionalId === candidate.professionalId && overlaps(candidate, x))) return 'professional' as const;
  if (candidate.resourceId && active.some(x => x.resourceId === candidate.resourceId && overlaps(candidate, x))) return 'resource' as const;
  return null;
}

export function appointmentToRange(a: Appointment): TimeRange {
  return { start: new Date(a.startsAt).getTime(), end: new Date(a.endsAt).getTime() };
}
