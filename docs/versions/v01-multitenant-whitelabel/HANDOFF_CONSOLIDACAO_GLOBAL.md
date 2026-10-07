# HANDOFF — CONSOLIDAÇÃO GLOBAL DE PRICING

> Vertical: **SaaS Dentista / OdontoFlow**  
> Estado: **DECISÕES DA VERTICAL FECHADAS**  
> Data: 2026-10-06

## Comercial travado

- Essencial: R$ 79,90/mês — R$ 862,92/ano;
- Pro: R$ 129,90/mês — R$ 1.402,92/ano — **Recomendado**;
- Premium: R$ 189,90/mês — R$ 2.050,92/ano;
- anual: 10% de desconto;
- implantação padrão na validação: R$ 0;
- trial futuro: 14 dias sem cartão;
- Add-ons externos: precificação posterior a custo/provedor.

## Limites travados na vertical

- profissionais: 1 / 3 / 10;
- admins adicionais: 2 / 6 / 20, sem contar `tenant_owner`;
- recursos físicos: 1 / 5 / 15;
- unidades: 1 / 1 / 1;
- pacientes/agendamentos/histórico: sem limite artificial;
- storage: 10 / 50 / 200 GB como hipótese interna, não promessa pública ainda.

## Regras de produto travadas

- segurança e integridade clínica não são diferencial de plano;
- downgrade não destrói dados;
- Premium é vendido por escala enquanto features avançadas não existirem;
- demo = `premium_demo` + `subscriptionStatus=demo`, dados fictícios e sem cobrança;
- feature não implementada não pode ser apresentada como disponível.

## CANDIDATO_A_PADRAO_GLOBAL

A consolidação global deve comparar entre verticais, sem assumir que o Dentista define sozinho:

1. `PlanCatalog`;
2. `EntitlementService`;
3. `DemoMode`;
4. `SubscriptionStatus`;
5. feature gating;
6. limits;
7. usage;
8. entitlement overrides por tenant;
9. trial lifecycle;
10. upgrade/downgrade;
11. atribuição manual de plano pelo Platform Owner.

## Não levar como padrão global automaticamente

- números 1/3/10 de profissionais;
- 2/6/20 admins;
- 1/5/15 recursos físicos;
- 10/50/200 GB de storage;
- composição específica Essencial/Pro/Premium desta vertical;
- features odontológicas e suas divisões comerciais.

## Situação técnica

O produto ainda **não possui planos reais tecnicamente enforceados**. O delta continua em `DELTA_TECNICO.md` e a priorização em `PRIORIZACAO.md`.

Nenhum GOAL de Codex é autorizado por este handoff.
