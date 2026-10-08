import { annualMonthlyEquivalentCents, PLAN_CATALOG, type PlanDefinition } from './planCatalog';

export type FeatureState = 'IMPLEMENTADA' | 'PLANEJADA' | 'DEFERRED';
export type CommercialPlanProposal = PlanDefinition & {
  highlights: Array<{ label: string; state: FeatureState }>;
};

export const PRICING_PROPOSAL_STATUS = 'PLANOS E PREÇOS APROVADOS' as const;

const planHighlights: Record<PlanDefinition['id'], CommercialPlanProposal['highlights']> = {
  essential: [
    { label: 'Agenda, pacientes e profissionais', state: 'IMPLEMENTADA' },
    { label: 'Prontuário e adendos clínicos', state: 'IMPLEMENTADA' },
    { label: 'Fotos clínicas privadas', state: 'IMPLEMENTADA' },
    { label: 'Site público da clínica', state: 'IMPLEMENTADA' },
    { label: 'Odontograma e plano de tratamento', state: 'PLANEJADA' },
  ],
  pro: [
    { label: 'Tudo do Essencial', state: 'IMPLEMENTADA' },
    { label: 'Até 3 profissionais e 5 recursos físicos', state: 'IMPLEMENTADA' },
    { label: 'Central de retorno', state: 'IMPLEMENTADA' },
    { label: 'Pré-cadastro por link', state: 'PLANEJADA' },
    { label: 'Orçamentos, financeiro e relatórios básicos', state: 'PLANEJADA' },
  ],
  premium: [
    { label: 'Tudo do Pro', state: 'IMPLEMENTADA' },
    { label: 'Até 10 profissionais e 15 recursos físicos', state: 'IMPLEMENTADA' },
    { label: 'Relatórios e financeiro avançados', state: 'PLANEJADA' },
    { label: 'Portal do paciente e automações', state: 'DEFERRED' },
  ],
};

/** Compatibility view for UI; all prices, audience and quotas come from PlanCatalog. */
export const commercialPlanProposal: CommercialPlanProposal[] = Object.values(PLAN_CATALOG).map(plan => ({
  ...plan,
  highlights: planHighlights[plan.id],
}));

export function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export function annualEquivalentCents(plan: Pick<PlanDefinition, 'annualPriceCents'>) {
  return annualMonthlyEquivalentCents(plan);
}
