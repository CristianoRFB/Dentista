import { describe, expect, it } from 'vitest';
import { annualEquivalentCents, commercialPlanProposal, PRICING_PROPOSAL_STATUS } from '../src/commercial/pricingProposal';

describe('catálogo público comercial', () => {
  it('marca preços e nomes como aprovados, sem implicar cobrança automática', () => {
    expect(PRICING_PROPOSAL_STATUS).toBe('PLANOS E PREÇOS APROVADOS');
  });

  it('keeps ascending monthly prices and limits', () => {
    const [essential, clinic, advanced] = commercialPlanProposal;
    expect(essential.monthlyPriceCents).toBeLessThan(clinic.monthlyPriceCents);
    expect(clinic.monthlyPriceCents).toBeLessThan(advanced.monthlyPriceCents);
    expect(essential.limits.professionals).toBeLessThan(clinic.limits.professionals);
    expect(clinic.limits.professionals).toBeLessThan(advanced.limits.professionals);
  });

  it('preserves exact approved annual totals and equivalent monthly values', () => {
    expect(annualEquivalentCents(commercialPlanProposal[0])).toBe(7191);
    expect(commercialPlanProposal.map(plan => plan.annualPriceCents)).toEqual([86292, 140292, 205092]);
    expect(commercialPlanProposal.map(plan => Math.round(plan.annualPriceCents / 12))).toEqual([7191, 11691, 17091]);
    expect(commercialPlanProposal.every(plan => !('clinicalMediaGb' in plan.limits))).toBe(true);
  });
});
