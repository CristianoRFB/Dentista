import type { SubscriptionStatus, Tenant } from '../domain/types';
import { canonicalPlanId, IMPLEMENTED_FEATURES, PLAN_CATALOG, type EntitlementFeature, type PlanLimit } from './planCatalog';

export interface EffectiveEntitlements {
  planId: 'essential' | 'pro' | 'premium' | null;
  sourcePlanId: Tenant['planId'] | undefined;
  subscriptionStatus: SubscriptionStatus | undefined;
  trialExpired: boolean;
  demo: boolean;
  features: Readonly<Record<EntitlementFeature, boolean>>;
  limits: Readonly<Record<PlanLimit, number | null>>;
}

const FEATURE_KEYS: readonly EntitlementFeature[] = [
  'agenda', 'patients', 'professionals', 'procedures', 'physical_resources', 'clinical_records',
  'clinical_photos', 'recall_center', 'mini_site', 'intake_link', 'treatment_plans', 'financial_reports',
  'advanced_reports', 'patient_portal', 'automations', 'multi_unit',
];
const LIMIT_KEYS: readonly PlanLimit[] = ['professionals', 'adminUsers', 'resources', 'units', 'patients', 'appointments', 'clinicalHistory', 'storageBytes'];
const CLINICAL_PRESERVATION_FEATURES = new Set<EntitlementFeature>(['clinical_records', 'clinical_photos']);

function timestampMs(value: unknown): number | null {
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    const parsed = (value as { toDate: () => Date }).toDate().getTime();
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function trialIsActive(tenant: Tenant, now = Date.now()) {
  return tenant.subscriptionStatus === 'trial' && (timestampMs(tenant.trialUntil) ?? 0) > now;
}

export function isCommerciallyActive(tenant: Tenant, now = Date.now()) {
  return tenant.subscriptionStatus === 'active' || trialIsActive(tenant, now)
    || (tenant.subscriptionStatus === 'demo' && tenant.planId === 'premium_demo');
}

export function getEffectiveEntitlements(tenant: Tenant, now = Date.now()): EffectiveEntitlements {
  const canonical = canonicalPlanId(tenant.planId);
  const demo = tenant.planId === 'premium_demo' && tenant.subscriptionStatus === 'demo';
  const invalidDemoAlias = tenant.planId === 'premium_demo' && !demo;
  const invalidDemoStatus = tenant.subscriptionStatus === 'demo' && !demo;
  const plan = canonical && !invalidDemoAlias && !invalidDemoStatus ? PLAN_CATALOG[canonical] : null;
  const trialExpired = tenant.subscriptionStatus === 'trial' && !trialIsActive(tenant, now);
  const features = Object.fromEntries(FEATURE_KEYS.map(key => {
    const override = tenant.entitlementOverrides?.[key];
    const inPlan = !!plan?.featureKeys.includes(key);
    const overridden = typeof override === 'boolean' ? override : inPlan;
    const configured = tenant.features?.[key];
    const implemented = IMPLEMENTED_FEATURES.has(key);
    const operationallyEnabled = configured === undefined || configured === true;
    const statusAllows = isCommerciallyActive(tenant, now) || CLINICAL_PRESERVATION_FEATURES.has(key);
    // Subscription state and commercial overrides never remove access to clinical history or media.
    const preservedClinicalAccess = CLINICAL_PRESERVATION_FEATURES.has(key) && !invalidDemoAlias && !invalidDemoStatus;
    return [key, implemented && operationallyEnabled && (preservedClinicalAccess || (!!plan && overridden && statusAllows))];
  })) as Record<EntitlementFeature, boolean>;
  const limits = Object.fromEntries(LIMIT_KEYS.map(key => {
    const approved = plan?.limits[key] ?? null;
    const override = tenant.limitOverrides?.[key];
    // Storage stays unbounded until byte measurement and cost controls exist.
    if (key === 'storageBytes') return [key, null];
    const candidate = override === undefined ? approved : override;
    return [key, candidate === null || (typeof candidate === 'number' && Number.isInteger(candidate) && candidate >= 0) ? candidate : approved];
  })) as Record<PlanLimit, number | null>;
  return {
    planId: plan?.id ?? null,
    sourcePlanId: tenant.planId,
    subscriptionStatus: tenant.subscriptionStatus,
    trialExpired,
    demo,
    features,
    limits,
  };
}

export function canUse(tenant: Tenant, featureKey: EntitlementFeature, now = Date.now()) {
  return getEffectiveEntitlements(tenant, now).features[featureKey] === true;
}

export function getLimit(tenant: Tenant, limitKey: PlanLimit): number | null {
  const effective = getEffectiveEntitlements(tenant);
  if (!effective.planId) throw new Error('O tenant não tem um plano comercial válido.');
  if (!LIMIT_KEYS.includes(limitKey)) throw new Error('Limite desconhecido.');
  return effective.limits[limitKey];
}

export function canCreateCommercialCapacity(tenant: Tenant, now = Date.now()) {
  if (tenant.planId === 'premium_demo' || tenant.subscriptionStatus === 'demo') return false;
  if (!canonicalPlanId(tenant.planId)) return false;
  if (tenant.subscriptionStatus === 'trial') return trialIsActive(tenant, now);
  return tenant.subscriptionStatus === 'active';
}

export function validateCommercialAssignment(input: {
  planId: string; subscriptionStatus: SubscriptionStatus; trialUntil?: string;
  entitlementOverrides?: Record<string, boolean>; limitOverrides?: Record<string, number | null>;
}) {
  if (!Object.hasOwn(PLAN_CATALOG, input.planId)) throw new Error('Plano comercial inválido.');
  if (input.subscriptionStatus === 'demo') throw new Error('O estado demo é reservado ao alias premium_demo.');
  if (input.subscriptionStatus === 'trial') {
    const until = timestampMs(input.trialUntil);
    if (!until || until <= Date.now() || until > Date.now() + 14 * 24 * 60 * 60 * 1000) {
      throw new Error('Informe uma data futura de encerramento, em até 14 dias.');
    }
  } else if (input.trialUntil) throw new Error('A data final só pode ser usada no estado trial.');
  for (const [key, value] of Object.entries(input.entitlementOverrides ?? {})) {
    if (!FEATURE_KEYS.includes(key as EntitlementFeature) || typeof value !== 'boolean') throw new Error('Override de entitlement inválido.');
  }
  for (const [key, value] of Object.entries(input.limitOverrides ?? {})) {
    if (!LIMIT_KEYS.includes(key as PlanLimit) || key === 'storageBytes'
      || !(value === null || (typeof value === 'number' && Number.isInteger(value) && value >= 0))) {
      throw new Error('Override de limite inválido.');
    }
  }
}
