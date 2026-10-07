import { describe, expect, it } from 'vitest';
import { PRODUCT_STANDARDS } from '../src/config/standards';

describe('standards do ecossistema', () => {
  it('registra o Core e os padrões revisados desta versão', () => {
    expect(PRODUCT_STANDARDS.coreVersion).toBe('v01');
    expect(PRODUCT_STANDARDS.global).toBe('GLOBAL-v01');
    expect(PRODUCT_STANDARDS.vertical).toBe('APPOINTMENT-v01');
    expect(PRODUCT_STANDARDS.product).toBe('DENTIST-v01');
  });
});
