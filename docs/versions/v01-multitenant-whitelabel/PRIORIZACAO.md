# PRIORIZACAO — Plans & Entitlements

> Execução do GOAL Global Standard v01 concluída no código local, mantendo decisões comerciais aprovadas.

## IMPLEMENTADO

1. PlanCatalog canônico Essencial/Pro/Premium, com valores mensais e anuais exatos.
2. `premium_demo` como alias Premium read-only, sem cobrança.
3. EntitlementService para catálogo, status, trial, overrides e flags operacionais.
4. Gates de navegação/rotas e validação em Worker/Firestore Rules.
5. Atribuição manual pelo Platform Owner com reason e auditoria before/after.
6. Contadores transacionais para profissionais, memberships adicionais e recursos físicos.
7. Rejeição de bypass por browser direto e preservação de dados ao reduzir quotas.
8. Pricing page ligada ao catálogo, sem checkout e sem promessas de features não prontas.

## PENDENTE OPERACIONAL

- configurar e validar produção com credenciais existentes do Firebase/Worker/R2; não criar outro serviço ou ambiente por tenant;
- snapshots reais continuam pendentes e independentes.

## DEFERRED

- medição de bytes R2 e quota pública/enforcement de storage;
- checkout, gateway, webhooks, billing automático e cobrança por uso;
- WhatsApp oficial, IA, assinatura digital, fiscal/NFS-e e integração externa;
- multi-unidade e features Premium ainda não implementadas.

## Regra de escopo

Conservar Core P0 e isolamento Multi-Tenant. Uma feature planejada não é liberada por override, e UI não substitui Worker/Rules.
