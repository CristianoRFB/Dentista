import { describe, expect, it } from 'vitest';
import { ADULT_TOOTH_ROWS, PRIMARY_TOOTH_ROWS, latestToothEvent, validateOdontogramInput } from '../src/domain/odontogram';

describe('Odontograma FDI', () => {
  it('representa 32 dentes permanentes e 20 decíduos sem duplicar IDs', () => {
    const teeth = [...ADULT_TOOTH_ROWS.flat(), ...PRIMARY_TOOTH_ROWS.flat()];
    expect(teeth).toHaveLength(52);
    expect(new Set(teeth).size).toBe(52);
    expect(teeth).toContain('16');
    expect(teeth).toContain('75');
  });
  it('valida superfícies, condições e observações escritas pelo profissional', () => {
    expect(validateOdontogramInput({ toothId: '16', surface: 'occlusal', finding: 'restoration', note: '  restauração antiga  ' })).toEqual({
      toothId: '16', surface: 'occlusal', finding: 'restoration', note: 'restauração antiga',
    });
    expect(() => validateOdontogramInput({ toothId: '99', surface: 'whole', finding: 'observed', note: '' })).toThrow();
    expect(() => validateOdontogramInput({ toothId: '16', surface: 'unknown', finding: 'observed', note: '' })).toThrow();
    expect(() => validateOdontogramInput({ toothId: '16', surface: 'whole', finding: 'diagnosis-ai', note: '' })).toThrow();
  });
  it('deriva última anotação sem mutar ou apagar eventos históricos', () => {
    const events = [
      { toothId: '16', surface: 'occlusal', createdAt: '2026-10-01T00:00:00Z' },
      { toothId: '16', surface: 'mesial', createdAt: '2026-10-02T00:00:00Z' },
      { toothId: '26', surface: 'whole', createdAt: '2026-10-03T00:00:00Z' },
    ];
    expect(latestToothEvent(events, '16')?.surface).toBe('mesial');
    expect(events[0].surface).toBe('occlusal');
    expect(events).toHaveLength(3);
  });
});
