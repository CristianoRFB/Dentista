# HISTORICAL — DO NOT EXECUTE

> Este GOAL foi superseded pelo `CODEX_GOAL_IMPLEMENTACAO_DENTISTA.txt` na raiz. O estágio atual é CORE_FIRST; entitlements/pricing runtime ficam para um GOAL posterior após novo readiness gate.

# GOAL_PRICING_ENTITLEMENTS_DENTISTA

> **STATUS DE EXECUÇÃO: NEXT — NÃO EXECUTAR ANTES DE AUTORIZAÇÃO EXPLÍCITA.**  
> Este GOAL não substitui o GOAL clínico atual e não autoriza cobrança automática.

## Objetivo

Implementar o mínimo técnico necessário para transformar a proposta Essencial / Pro / Premium em entitlements reais, preservando o escopo e a arquitetura do SaaS Dentista.

## Fonte da verdade

Antes de qualquer alteração, ler:

1. `docs/CURRENT.md`;
2. `docs/versions/v01-multitenant-whitelabel/FEATURE_MATRIX.md`;
3. `docs/versions/v01-multitenant-whitelabel/PRICING_AND_PLANS.md`;
4. `docs/versions/v01-multitenant-whitelabel/DELTA_TECNICO.md`;
5. `docs/versions/v01-multitenant-whitelabel/PRIORIZACAO.md`;
6. `docs/versions/v01-multitenant-whitelabel/DECISOES_PRICING.md`.

Não reauditar produto nem redefinir planos durante a execução deste GOAL.

## Preservar

- Multi-Tenant White-Label atual;
- RBAC/memberships;
- Platform Owner;
- isolamento Tenant A x B;
- regras clínicas e privacidade;
- `premium_demo`;
- Core clínico sem paywall de segurança/integridade;
- pacientes, agendamentos e histórico clínico sem limite artificial;
- downgrade sem destruição de dados.

## Escopo de implementação — NEXT

### 1. Catálogo de runtime

Criar fonte canônica tipada/versionada para:

- `essential` / Essencial;
- `pro` / Pro;
- `premium` / Premium;
- `premium_demo` / Demo.

O catálogo deve conter feature keys e limit keys, mas não gateway de pagamento.

### 2. Entitlement service

Implementar API interna equivalente a:

```ts
getEffectiveEntitlements(tenant)
canUse(tenant, featureKey)
getLimit(tenant, limitKey)
```

Resolução:

```text
base plan
+ tenant overrides
+ subscription status
= effective entitlements
```

Overrides devem ser dados; nunca hardcode por tenant.

### 3. Feature gating

Aplicar gating em:

- navegação;
- rotas;
- componentes;
- ações.

Gating de UI nunca substitui autorização de backend.

### 4. Backend validation

Antes de mutações/consumo de recursos, validar:

- tenant ativo;
- membership/permissão;
- subscription status;
- feature entitlement;
- limit quando aplicável.

Aplicar especialmente ao Worker R2 e futuras APIs privilegiadas.

### 5. Limits

Enforcement confiável/atômico para:

- profissionais: 1 / 3 / 10;
- admins não clínicos: 2 / 6 / 20;
- recursos físicos: 1 / 5 / 15;
- storage: 10 / 50 / 200 GB após medição real ser confiável.

Não bloquear leitura de dados existentes em downgrade.

### 6. Subscription lifecycle

Suportar tecnicamente:

```text
trial
active
past_due
suspended
cancelled
demo
```

Primeiro fluxo permitido: Platform Owner define plano/status manualmente.

### 7. Demo

`premium_demo` deve:

- usar dados fictícios;
- não gerar cobrança;
- respeitar isolamento;
- liberar somente features que existam no build;
- rotular features conceituais quando exibidas em demo.

### 8. Upgrade / downgrade

- preservar todo histórico clínico;
- preservar mídia já existente;
- impedir apenas nova criação acima do limite quando necessário;
- exibir motivo e caminho de upgrade;
- permitir reversão sem migração destrutiva.

### 9. Testes

Criar fixtures:

- Essencial;
- Pro;
- Premium;
- Demo.

Cobrir:

- `canUse/getLimit`;
- UI/route gates;
- backend gates;
- limites e concorrência;
- overrides;
- trial/status;
- upgrade/downgrade;
- R2 quota/permissão;
- Tenant A x Tenant B.

### 10. Documentação

Após implementação, atualizar documentação vigente e criar runbook de:

- catálogo;
- feature keys;
- limit keys;
- status;
- overrides;
- downgrade;
- suporte.

## Fora do escopo

NÃO implementar neste GOAL:

- Stripe/Mercado Pago/outro gateway;
- checkout;
- webhooks financeiros;
- cobrança automática;
- billing por uso;
- WhatsApp;
- IA;
- assinatura digital;
- fiscal;
- multi-unidade;
- novas features clínicas só para justificar Premium.

## Critérios de aceite

1. plano/status podem ser definidos manualmente pelo Platform Owner;
2. entitlements são resolvidos por serviço único e testável;
3. UI e backend não divergem em feature protegida;
4. limites são validados de forma confiável;
5. overrides não exigem código específico de tenant;
6. downgrade preserva dados clínicos;
7. Demo não é tratada como assinatura paga;
8. Tenant A não afeta entitlements/dados do Tenant B;
9. testes por plano passam;
10. nenhuma cobrança automática foi adicionada.
