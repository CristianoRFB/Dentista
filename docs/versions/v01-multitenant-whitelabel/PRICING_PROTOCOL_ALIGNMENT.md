# PRICING PROTOCOL ALIGNMENT

> Estado da proposta preservada como origem em 2026-10-06. Implementação atualizada em 2026-10-09 abaixo; o snapshot original não representa o runtime de hoje.

Revisão local contra `SAAS_PRICING_PLANS_REFACTOR_PROTOCOL(1).md` em 2026-10-06.

## Resultado

- estado real auditado antes de pricing: ✅
- `FEATURE_INVENTORY.md`: ✅
- features classificadas CORE/GROWTH/ADVANCED/ADD-ON/PLATFORM_INTERNAL: ✅
- planos próprios da vertical: ✅ aprovados e implementados no PlanCatalog
- preços próprios da vertical: ✅ aprovados e implementados no PlanCatalog
- limites separados de features: ✅
- demo `premium_demo`: ✅ alias read-only com dados fictícios e enforcement
- landing/pricing honesta sobre o estado: ✅ refatorada
- delta técnico de entitlements: ✅ documentado
- NOW/NEXT/DEFERRED: ✅
- cobrança automática: ❌ não implementada, corretamente DEFERRED
- feature gating real: ✅ implementado no runtime/Worker/Firestore Rules

## Regra de verdade

Marketing não prevalece sobre `FEATURE_INVENTORY.md`.

Se uma feature estiver `PLANEJADA`, `DEFERRED` ou `EM_IMPLEMENTACAO`, ela não pode ser comunicada como funcionalidade pronta de produção sem rótulo explícito.


## Refatoração executiva

Sem nova auditoria: a auditoria acima foi usada como fonte. A camada de decisão atual está em `PRICING_EXECUTIVE_PACKAGE.md` e arquivos relacionados. Nomenclatura comercial atual: Essencial / Pro / Premium.

## Estado técnico após GOAL Global Standard v01 — 2026-10-09

PlanCatalog, entitlements, gates, quotas transacionais e atribuição manual auditada estão implementados. A matriz técnica atual é `FEATURE_MATRIX.md`; o contrato operacional é `PLANS_AND_ENTITLEMENTS.md`. Medição de bytes R2, evidências visuais reais e deploy de produção permanecem pendentes por dependências operacionais. Billing automático continua deferred.
