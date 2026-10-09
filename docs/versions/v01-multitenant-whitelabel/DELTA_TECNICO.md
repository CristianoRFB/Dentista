# DELTA_TECNICO — Plans & Entitlements v01

> Preços e quotas preservados conforme decisões aprovadas. Sem nova auditoria comercial e sem implementação de billing automático.

| Área | Estado atual | Evidência/limite |
|---|---|---|
| Catálogo de planos | IMPLEMENTADO | `src/commercial/planCatalog.ts` é a fonte canônica; preço mensal e total anual exatos |
| Entitlements | IMPLEMENTADO | `getEffectiveEntitlements`, `canUse`, `getLimit`; plano + status + overrides + configuração + disponibilidade no código |
| Demo | IMPLEMENTADO | `premium_demo/demo` é alias read-only; dados fictícios e sem capacidade/API de escrita |
| Atribuição comercial | IMPLEMENTADA | Platform Owner, motivo obrigatório, snapshot before/after sem conteúdo clínico |
| Feature gates | IMPLEMENTADOS | navegação/rotas e validações relevantes no Worker/Rules |
| Profissionais | ENFORCED | 1 / 3 / 10; contador atômico do Worker; browser Firestore writes negados |
| Memberships não-owner ativas | ENFORCED | 2 / 6 / 20; tenant_owner excluído; Worker transacional |
| Recursos físicos ativos | ENFORCED | 1 / 5 / 15; primeiro recurso é permitido no Essencial; browser writes negados |
| Downgrade e excesso | IMPLEMENTADO | dados existentes preservados; criação/reativação acima da quota recusada; desativação continua possível |
| Clínica e histórico | PRESERVADOS | pacientes, agendamentos e histórico clínico sem limite artificial; acesso clínico não vira paywall |
| Trial/status | MANUAL | trial explícito de até 14 dias; estados não fazem cobrança/conversão automática |
| Storage R2 | PENDENTE DE MEDIÇÃO | `storageBytes = null`; sem franquia pública, enforcement, excedente ou cobrança |
| Billing/checkout | DEFERRED | sem gateway, webhook, checkout ou cobrança automática |
| Provisionamento/deploy | PENDENTE OPERACIONAL | usar o Worker/R2/Firebase existentes; não criar serviços ou ambientes por tenant |
| Evidências visuais | PENDENTE | screenshots reais continuam independentes e não são substituídos por mockups |

## Regras de preservação

- `tenant.features` desliga operação quando explicitamente `false`; não concede feature fora de plano/implementação.
- `entitlementOverrides` pode habilitar/desabilitar somente chave conhecida e implementada.
- `limitOverrides` aceita inteiro não negativo ou `null`; storage não pode ser sobrescrito.
- `tenant.limits` fica legado e não é fonte de quota.
- `past_due`, `suspended` e `cancelled` não liberam novos usos comerciais; clinical records/photos preservam fluxo clínico e histórico conforme RBAC.
- demo não aceita mutação, mesmo com permissão ou chamada direta ao Worker.
