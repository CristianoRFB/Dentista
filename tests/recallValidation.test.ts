import { describe, expect, it } from 'vitest';
import { recallDisplayStatus, validateRecallForm, validateRecallTransition } from '../src/lib/recallValidation';
import type { Recall } from '../src/domain/types';

describe('Fluxo de retornos', () => {
  it('normaliza um retorno válido sem interpretar diagnóstico', () => {
    expect(validateRecallForm({ patientId: 'patient-a', reason: 'Revisão da profilaxia', dueAt: '2026-12-20' })).toEqual({
      patientId: 'patient-a', reason: 'Revisão da profilaxia', dueAt: '2026-12-20T12:00:00.000Z',
    });
  });
  it('rejeita data impossível, paciente inválido e motivo vazio', () => {
    expect(() => validateRecallForm({ patientId: '../B', reason: 'Retorno', dueAt: '2026-11-10' })).toThrow();
    expect(() => validateRecallForm({ patientId: 'patient-a', reason: '  ', dueAt: '2026-11-10' })).toThrow();
    expect(() => validateRecallForm({ patientId: 'patient-a', reason: 'Retorno', dueAt: '2026-02-30' })).toThrow();
    expect(() => validateRecallForm({ patientId: 'patient-a', reason: 'Retorno', dueAt: '2026-2-1' })).toThrow();
  });
  it('exige agendamento real para encerrar como scheduled e impede reabertura silenciosa', () => {
    expect(() => validateRecallTransition('planned', 'scheduled')).toThrow();
    expect(() => validateRecallTransition('dismissed', 'planned')).toThrow();
    expect(() => validateRecallTransition('planned', 'scheduled', 'appointment-a')).not.toThrow();
  });
  it('marca vencido em leitura sem alterar o documento persistido', () => {
    const row: Recall = { id: 'r', tenantId: 'A', patientId: 'patient-a', reason: 'Revisão', dueAt: '2026-01-01T12:00:00.000Z', status: 'planned' };
    expect(recallDisplayStatus(row, Date.parse('2026-02-01T12:00:00Z'))).toBe('due');
    expect(row.status).toBe('planned');
  });
});
