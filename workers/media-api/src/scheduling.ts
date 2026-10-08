export const MAX_APPOINTMENT_DURATION_MS = 8 * 60 * 60 * 1000;
export const MAX_CONFLICT_LOOKBACK_MS = 24 * 60 * 60 * 1000;

export interface AppointmentWindow {
  startsAt: string;
  endsAt: string;
  professionalId: string;
  resourceId?: string;
}

export interface Reservation extends AppointmentWindow {
  id?: string;
  status?: string;
}

export interface ScheduleBlockWindow {
  startsAt: string;
  endsAt: string;
  professionalId?: string;
  resourceId?: string;
  active?: boolean;
}

export function parseCanonicalDate(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) return null;
  return milliseconds;
}

export function isValidAppointmentWindow(window: AppointmentWindow): boolean {
  const start = parseCanonicalDate(window.startsAt);
  const end = parseCanonicalDate(window.endsAt);
  return start !== null && end !== null && end > start
    && end - start <= MAX_APPOINTMENT_DURATION_MS
    && typeof window.professionalId === 'string' && window.professionalId.length > 0
    && window.professionalId.length <= 128;
}

export function rangesOverlap(a: { startsAt: string; endsAt: string }, b: { startsAt: string; endsAt: string }): boolean {
  const aStart = Date.parse(a.startsAt);
  const aEnd = Date.parse(a.endsAt);
  const bStart = Date.parse(b.startsAt);
  const bEnd = Date.parse(b.endsAt);
  return Number.isFinite(aStart) && Number.isFinite(aEnd) && Number.isFinite(bStart) && Number.isFinite(bEnd)
    && aStart < bEnd && bStart < aEnd;
}

export function findScheduleConflict(candidate: AppointmentWindow, existing: Reservation[], blocks: ScheduleBlockWindow[], excludedId?: string) {
  const active = existing.filter(item => item.id !== excludedId && !['cancelled', 'no_show'].includes(item.status ?? ''));
  if (active.some(item => item.professionalId === candidate.professionalId && rangesOverlap(candidate, item))) return 'professional' as const;
  if (candidate.resourceId && active.some(item => item.resourceId === candidate.resourceId && rangesOverlap(candidate, item))) return 'resource' as const;
  if (blocks.some(block => block.active !== false
    && ((!block.professionalId && !block.resourceId)
      || block.professionalId === candidate.professionalId
      || (!!candidate.resourceId && block.resourceId === candidate.resourceId))
    && rangesOverlap(candidate, block))) return 'blocked' as const;
  return null;
}

export function utcDayKeys(startsAt: string, endsAt: string): string[] {
  const start = parseCanonicalDate(startsAt);
  const end = parseCanonicalDate(endsAt);
  if (start === null || end === null || end <= start) throw new Error('Invalid appointment interval');
  const first = new Date(start);
  let day = Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), first.getUTCDate());
  const last = end - 1;
  const days: string[] = [];
  while (day <= last) {
    const date = new Date(day);
    days.push(date.toISOString().slice(0, 10).replaceAll('-', ''));
    day += 86_400_000;
  }
  return days;
}

export function scheduleLockIds(window: AppointmentWindow) {
  const ids = new Set<string>();
  const dimensions: Array<{ kind: 'professional' | 'resource'; id?: string }> = [
    { kind: 'professional', id: window.professionalId },
    { kind: 'resource', id: window.resourceId },
  ];
  for (const day of utcDayKeys(window.startsAt, window.endsAt)) {
    for (const dimension of dimensions) {
      if (!dimension.id) continue;
      const encoded = encodeURIComponent(dimension.id).replaceAll('%', '_');
      ids.add(dimension.kind + '_' + encoded + '_' + day);
    }
  }
  return [...ids];
}
