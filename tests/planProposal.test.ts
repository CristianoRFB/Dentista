import { describe, expect, it } from 'vitest';
import { annualEquivalentCents, commercialPlanProposal, PRICING_PROPOSAL_STATUS } from '../src/commercial/pricingProposal';

describe('pricing proposal (commercial data only)', () => {
  it('is explicitly marked as proposal', () => {
    expect(PRICING_PROPOSAL_STATUS).toBe('PROPOSTA_EM_VALIDACAO');
  });

  it('keeps ascending monthly prices and limits', () => {
    const [essential, clinic, advanced] = commercialPlanProposal;
    expect(essential.monthlyPriceCents).toBeLessThan(clinic.monthlyPriceCents);
    expect(clinic.monthlyPriceCents).toBeLessThan(advanced.monthlyPriceCents);
    expect(essential.limits.professionals).toBeLessThan(clinic.limits.professionals);
    expect(clinic.limits.professionals).toBeLessThan(advanced.limits.professionals);
  });

  it('uses the proposed 10% annual discount', () => {
    expect(annualEquivalentCents(commercialPlanProposal[0])).toBe(7191);
  });
});
