import { describe, expect, it } from 'vitest';
import {
  findScheduleConflict, isValidAppointmentWindow, parseCanonicalDate, rangesOverlap, scheduleLockIds,
  utcDayKeys, type AppointmentWindow, type ScheduleBlockWindow,
} from '../workers/media-api/src/scheduling';

const candidate: AppointmentWindow = {
  professionalId: 'prof-a', resourceId: 'chair-a',
  startsAt: '2026-10-08T09:00:00.000Z', endsAt: '2026-10-08T10:00:00.000Z',
};

describe('validação confiável de agenda', () => {
  it('aceita intervalos ISO válidos e rejeita horários inválidos ou longos', () => {
    expect(isValidAppointmentWindow(candidate)).toBe(true);
    expect(parseCanonicalDate('2026-10-08T09:00:00Z')).toBeNull();
    expect(isValidAppointmentWindow({ ...candidate, endsAt: candidate.startsAt })).toBe(false);
    expect(isValidAppointmentWindow({ ...candidate, endsAt: '2026-10-09T09:01:00.000Z' })).toBe(false);
  });

  it('detecta conflito por profissional ou recurso e ignora cancelamentos', () => {
    expect(findScheduleConflict(candidate, [{
      id: 'existing', professionalId: 'prof-a', resourceId: 'chair-b',
      startsAt: '2026-10-08T09:30:00.000Z', endsAt: '2026-10-08T10:30:00.000Z', status: 'confirmed',
    }], [])).toBe('professional');
    expect(findScheduleConflict(candidate, [{
      id: 'existing', professionalId: 'prof-b', resourceId: 'chair-a',
      startsAt: '2026-10-08T09:30:00.000Z', endsAt: '2026-10-08T10:30:00.000Z', status: 'confirmed',
    }], [])).toBe('resource');
    expect(findScheduleConflict(candidate, [{
      id: 'cancelled', professionalId: 'prof-a', resourceId: 'chair-a',
      startsAt: '2026-10-08T09:30:00.000Z', endsAt: '2026-10-08T10:30:00.000Z', status: 'cancelled',
    }], [])).toBeNull();
    expect(findScheduleConflict(candidate, [{
      id: 'no-show', professionalId: 'prof-a', resourceId: 'chair-a',
      startsAt: '2026-10-08T09:30:00.000Z', endsAt: '2026-10-08T10:30:00.000Z', status: 'no_show',
    }], [])).toBeNull();
  });

  it('valida bloqueio geral, por profissional ou recurso', () => {
    const blocks: ScheduleBlockWindow[] = [
      { startsAt: '2026-10-08T09:30:00.000Z', endsAt: '2026-10-08T10:30:00.000Z', active: true },
    ];
    expect(findScheduleConflict(candidate, [], blocks)).toBe('blocked');
    expect(findScheduleConflict(candidate, [], [{
      professionalId: 'prof-a', startsAt: '2026-10-08T09:30:00.000Z', endsAt: '2026-10-08T10:30:00.000Z',
    }])).toBe('blocked');
    expect(findScheduleConflict(candidate, [], [{
      resourceId: 'chair-a', startsAt: '2026-10-08T09:30:00.000Z', endsAt: '2026-10-08T10:30:00.000Z',
    }])).toBe('blocked');
    expect(findScheduleConflict(candidate, [], [{ ...blocks[0], active: false }])).toBeNull();
  });

  it('usa locks estáveis por profissional/recurso e inclui dias atravessados', () => {
    const overnight = {
      professionalId: 'prof-a', resourceId: 'chair-a',
      startsAt: '2026-10-08T23:30:00.000Z', endsAt: '2026-10-09T00:30:00.000Z',
    };
    expect(utcDayKeys(overnight.startsAt, overnight.endsAt)).toEqual(['20261008','20261009']);
    const locks = scheduleLockIds(overnight);
    expect(locks).toContain('professional_prof-a_20261008');
    expect(locks).toContain('professional_prof-a_20261009');
    expect(locks).toContain('resource_chair-a_20261008');
    const overlapping = {
      professionalId: 'prof-a', startsAt: '2026-10-09T00:00:00.000Z', endsAt: '2026-10-09T01:00:00.000Z',
    };
    expect(scheduleLockIds(overlapping)).toContain('professional_prof-a_20261009');
  });

  it('trata o fim do atendimento como limite exclusivo', () => {
    expect(rangesOverlap(candidate, {
      startsAt: candidate.endsAt, endsAt: '2026-10-08T11:00:00.000Z',
    })).toBe(false);
  });
});
