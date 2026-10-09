import { describe, expect, it } from 'vitest';
import type { Tenant } from '../src/domain/types';
import { canCreateCommercialCapacity, canUse, getEffectiveEntitlements, getLimit, validateCommercialAssignment } from '../src/commercial/entitlementService';
import { PLAN_CATALOG, canonicalPlanId } from '../src/commercial/planCatalog';

const tenant = (id: string, planId: Tenant['planId'], subscriptionStatus: Tenant['subscriptionStatus'], extra: Partial<Tenant> = {}): Tenant => ({
  id, name: id, slug: id.toLowerCase(), status: 'active', planId, subscriptionStatus, features: {}, limits: {}, ...extra,
});

describe('PlanCatalog e EntitlementService', () => {
  const essentialA = tenant('tenant-A', 'essential', 'active');
  const proA = tenant('tenant-A-pro', 'pro', 'active');
  const premiumB = tenant('tenant-B', 'premium', 'active');
  const demoB = tenant('tenant-B-demo', 'premium_demo', 'demo');

  it('mantém quatro perfis comerciais em dois tenants e valores anuais aprovados', () => {
    expect(Object.values(PLAN_CATALOG).map(plan => [plan.id, plan.monthlyPriceCents, plan.annualPriceCents])).toEqual([
      ['essential', 7990, 86292], ['pro', 12990, 140292], ['premium', 18990, 205092],
    ]);
    expect(canonicalPlanId(demoB.planId)).toBe('premium');
    expect(Object.keys(PLAN_CATALOG)).not.toContain('premium_demo');
    expect(getEffectiveEntitlements(essentialA).demo).toBe(false);
    expect(getEffectiveEntitlements(proA).planId).toBe('pro');
    expect(getEffectiveEntitlements(premiumB).planId).toBe('premium');
    expect(getEffectiveEntitlements(demoB).demo).toBe(true);
  });

  it('aplica herança de plano, implementação real e configuração operacional', () => {
    expect(canUse(essentialA, 'agenda')).toBe(true);
    expect(canUse(essentialA, 'recall_center')).toBe(false);
    expect(canUse(proA, 'recall_center')).toBe(false);
    expect(canUse(premiumB, 'patient_portal')).toBe(false);
    expect(canUse({ ...proA, features: { recall_center: false } }, 'recall_center')).toBe(false);
    expect(canUse({ ...essentialA, entitlementOverrides: { recall_center: true } }, 'recall_center')).toBe(false);
    expect(canUse({ ...premiumB, entitlementOverrides: { patient_portal: true } }, 'patient_portal')).toBe(false);
    expect(canUse({ ...proA, entitlementOverrides: { recall_center: false } }, 'recall_center')).toBe(false);
    expect(canUse({ ...premiumB, planId: 'premium_demo', subscriptionStatus: 'active' }, 'agenda')).toBe(false);
    expect(canUse({ ...essentialA, subscriptionStatus: 'demo' }, 'clinical_records')).toBe(false);
    expect(canUse({ ...proA, features: { recall_center: 'on' as never } }, 'recall_center')).toBe(false);
  });

  it('retorna quotas aprovadas, sem limites artificiais e sem enforcement de storage', () => {
    expect(getLimit(essentialA, 'professionals')).toBe(1);
    expect(getLimit(proA, 'adminUsers')).toBe(6);
    expect(getLimit(premiumB, 'resources')).toBe(15);
    expect(getLimit(essentialA, 'units')).toBe(1);
    expect(getLimit(proA, 'patients')).toBeNull();
    expect(getLimit(premiumB, 'appointments')).toBeNull();
    expect(getLimit(premiumB, 'clinicalHistory')).toBeNull();
    expect(getLimit({ ...essentialA, limitOverrides: { professionals: 0 } }, 'professionals')).toBe(0);
    expect(getLimit({ ...essentialA, limitOverrides: { professionals: null } }, 'professionals')).toBeNull();
    expect(getLimit({ ...essentialA, limitOverrides: { professionals: -1 } }, 'professionals')).toBe(1);
    expect(getLimit({ ...essentialA, limitOverrides: { storageBytes: 1_000 } } as Tenant, 'storageBytes')).toBeNull();
    const unassigned = tenant('fictional-unassigned', undefined, undefined);
    expect(getEffectiveEntitlements(unassigned).planId).toBeNull();
    expect(() => getLimit(unassigned, 'professionals')).toThrow(/plano comercial válido/);
    expect(canUse(unassigned, 'agenda')).toBe(false);
    expect(canUse(unassigned, 'clinical_records')).toBe(true);
    expect(canCreateCommercialCapacity(unassigned)).toBe(false);
    expect(canUse({ ...unassigned, entitlementOverrides: { clinical_photos: false } }, 'clinical_photos')).toBe(true);
    expect(() => getLimit(essentialA, 'invented' as never)).toThrow(/Limite desconhecido/);
  });

  it('expira trial por data explícita sem converter status e bloqueia nova capacidade', () => {
    const now = Date.parse('2026-10-08T12:00:00.000Z');
    const trial = tenant('trial', 'pro', 'trial', { trialUntil: '2026-10-09T12:00:00.000Z' });
    expect(canUse(trial, 'agenda', now)).toBe(true);
    expect(canCreateCommercialCapacity(trial, now)).toBe(true);
    expect(getEffectiveEntitlements(trial, now + 86_400_001).trialExpired).toBe(true);
    expect(canUse(trial, 'agenda', now + 86_400_001)).toBe(false);
    expect(canCreateCommercialCapacity(trial, now + 86_400_001)).toBe(false);
    expect(trial.subscriptionStatus).toBe('trial');
  });

  it('status comerciais não apagam nem paywallam a integridade clínica', () => {
    for (const status of ['past_due', 'suspended', 'cancelled'] as const) {
      const row = tenant('blocked-' + status, 'pro', status);
      expect(canCreateCommercialCapacity(row)).toBe(false);
      expect(canUse(row, 'agenda')).toBe(false);
      expect(canUse(row, 'clinical_records')).toBe(true);
      expect(getLimit(row, 'clinicalHistory')).toBeNull();
    }
    expect(canCreateCommercialCapacity(demoB)).toBe(false);
    expect(canUse(demoB, 'clinical_photos')).toBe(true);
  });

  it('valida atribuição manual, trial de até 14 dias e overrides conhecidos', () => {
    expect(() => validateCommercialAssignment({ planId: 'premium_demo', subscriptionStatus: 'active' })).toThrow(/Plano comercial inválido/);
    expect(() => validateCommercialAssignment({ planId: 'pro', subscriptionStatus: 'demo' })).toThrow(/alias premium_demo/);
    expect(() => validateCommercialAssignment({ planId: 'pro', subscriptionStatus: 'trial' })).toThrow(/data futura/);
    expect(() => validateCommercialAssignment({ planId: 'pro', subscriptionStatus: 'active', trialUntil: '2099-01-01T00:00:00Z' })).toThrow(/só pode/);
    expect(() => validateCommercialAssignment({ planId: 'pro', subscriptionStatus: 'active', limitOverrides: { storageBytes: 12 } })).toThrow(/Override de limite/);
    expect(() => validateCommercialAssignment({ planId: 'pro', subscriptionStatus: 'active', entitlementOverrides: { fake_feature: true } })).toThrow(/Override de entitlement/);
    expect(() => validateCommercialAssignment({ planId: 'pro', subscriptionStatus: 'trial', trialUntil: new Date(Date.now() + 13 * 86_400_000).toISOString() })).not.toThrow();
  });
});
