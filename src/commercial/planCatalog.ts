import type { PlanId } from '../domain/types';

export type PaidPlanId = Exclude<PlanId, 'premium_demo'>;
export type EntitlementFeature =
  | 'agenda' | 'patients' | 'professionals' | 'procedures' | 'physical_resources'
  | 'clinical_records' | 'clinical_photos' | 'recall_center' | 'mini_site'
  | 'intake_link' | 'treatment_plans' | 'financial_reports' | 'advanced_reports'
  | 'patient_portal' | 'automations' | 'multi_unit';
export type PlanLimit = 'professionals' | 'adminUsers' | 'resources' | 'units' | 'patients' | 'appointments' | 'clinicalHistory' | 'storageBytes';

export interface PlanDefinition {
  id: PaidPlanId;
  name: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
  recommended?: boolean;
  audience: string;
  featureKeys: readonly EntitlementFeature[];
  limits: Readonly<Record<PlanLimit, number | null>>;
}

const sharedCore = ['agenda', 'patients', 'professionals', 'procedures', 'physical_resources', 'clinical_records', 'clinical_photos', 'mini_site'] as const satisfies readonly EntitlementFeature[];
const proFeatures = [...sharedCore, 'recall_center'] as const satisfies readonly EntitlementFeature[];

/** Approved vertical prices and plan limits. Keep this as the only runtime source. */
export const PLAN_CATALOG: Readonly<Record<PaidPlanId, PlanDefinition>> = {
  essential: {
    id: 'essential', name: 'Essencial', monthlyPriceCents: 7990, annualPriceCents: 86292,
    audience: 'Dentista solo ou consultório enxuto', featureKeys: sharedCore,
    limits: { professionals: 1, adminUsers: 2, resources: 1, units: 1, patients: null, appointments: null, clinicalHistory: null, storageBytes: null },
  },
  pro: {
    id: 'pro', name: 'Pro', monthlyPriceCents: 12990, annualPriceCents: 140292, recommended: true,
    audience: 'Clínica pequena ou média com equipe', featureKeys: proFeatures,
    limits: { professionals: 3, adminUsers: 6, resources: 5, units: 1, patients: null, appointments: null, clinicalHistory: null, storageBytes: null },
  },
  premium: {
    id: 'premium', name: 'Premium', monthlyPriceCents: 18990, annualPriceCents: 205092,
    audience: 'Clínica maior com gestão mais exigente', featureKeys: proFeatures,
    limits: { professionals: 10, adminUsers: 20, resources: 15, units: 1, patients: null, appointments: null, clinicalHistory: null, storageBytes: null },
  },
};

/** Features with a real, usable implementation in this checkout. Planned/demo-only items stay unavailable. */
export const IMPLEMENTED_FEATURES: ReadonlySet<EntitlementFeature> = new Set([
  'agenda', 'patients', 'professionals', 'procedures', 'physical_resources',
  'clinical_records', 'clinical_photos', 'recall_center', 'mini_site',
]);

export function canonicalPlanId(planId: PlanId | undefined): PaidPlanId | null {
  if (planId === 'premium_demo') return 'premium';
  return planId && Object.hasOwn(PLAN_CATALOG, planId) ? planId as PaidPlanId : null;
}

export function annualMonthlyEquivalentCents(plan: Pick<PlanDefinition, 'annualPriceCents'>) {
  return Math.round(plan.annualPriceCents / 12);
}
