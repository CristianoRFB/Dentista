/**
 * COMMERCIAL PROPOSAL ONLY.
 *
 * This catalog powers the demonstrative pricing page. It is NOT a runtime
 * authorization source and must not be used as proof that entitlements are
 * enforced. See docs/.../ENTITLEMENTS_DELTA.md.
 */
export type FeatureState = 'IMPLEMENTADA' | 'EM_IMPLEMENTACAO' | 'PLANEJADA' | 'DEFERRED';

export interface CommercialPlanProposal {
  id: 'essential' | 'pro' | 'premium';
  name: string;
  monthlyPriceCents: number;
  annualDiscountPercent: number;
  audience: string;
  recommended?: boolean;
  highlights: Array<{ label: string; state: FeatureState }>;
  limits: {
    professionals: number;
    adminUsers: number;
    resources: number;
    clinicalMediaGb: number;
  };
}

export const PRICING_PROPOSAL_STATUS = 'PROPOSTA_EM_VALIDACAO' as const;

export const commercialPlanProposal: CommercialPlanProposal[] = [
  {
    id: 'essential',
    name: 'Essencial',
    monthlyPriceCents: 7990,
    annualDiscountPercent: 10,
    audience: 'Dentista solo ou consultório enxuto',
    highlights: [
      { label: 'Agenda e pacientes', state: 'EM_IMPLEMENTACAO' },
      { label: 'Prontuário e odontograma', state: 'PLANEJADA' },
      { label: 'Fotos clínicas', state: 'EM_IMPLEMENTACAO' },
      { label: 'Plano de tratamento básico', state: 'PLANEJADA' },
      { label: 'Site e agendamento online', state: 'EM_IMPLEMENTACAO' },
    ],
    limits: { professionals: 1, adminUsers: 2, resources: 1, clinicalMediaGb: 10 },
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPriceCents: 12990,
    annualDiscountPercent: 10,
    audience: 'Clínica pequena ou média com equipe',
    recommended: true,
    highlights: [
      { label: 'Tudo do Essencial', state: 'EM_IMPLEMENTACAO' },
      { label: 'Até 3 profissionais', state: 'PLANEJADA' },
      { label: 'Cadeiras, salas e recursos', state: 'EM_IMPLEMENTACAO' },
      { label: 'Central de retorno', state: 'EM_IMPLEMENTACAO' },
      { label: 'Pré-cadastro por link', state: 'EM_IMPLEMENTACAO' },
      { label: 'Orçamentos, financeiro e relatórios básicos', state: 'PLANEJADA' },
    ],
    limits: { professionals: 3, adminUsers: 6, resources: 5, clinicalMediaGb: 50 },
  },
  {
    id: 'premium',
    name: 'Premium',
    monthlyPriceCents: 18990,
    annualDiscountPercent: 10,
    audience: 'Clínica maior com gestão mais exigente',
    highlights: [
      { label: 'Tudo do Pro', state: 'EM_IMPLEMENTACAO' },
      { label: 'Até 10 profissionais', state: 'PLANEJADA' },
      { label: 'Relatórios e financeiro avançados', state: 'PLANEJADA' },
      { label: 'Portal do paciente', state: 'DEFERRED' },
      { label: 'Automações avançadas', state: 'DEFERRED' },
      { label: 'Limites ampliados', state: 'PLANEJADA' },
    ],
    limits: { professionals: 10, adminUsers: 20, resources: 15, clinicalMediaGb: 200 },
  },
];

export function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export function annualEquivalentCents(plan: CommercialPlanProposal) {
  return Math.round(plan.monthlyPriceCents * (1 - plan.annualDiscountPercent / 100));
}
