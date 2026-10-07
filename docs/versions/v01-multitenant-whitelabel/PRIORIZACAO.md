# PRIORIZACAO — Pricing & Entitlements

> Decisões comerciais da vertical: **APROVADAS**.  
> Esta priorização continua técnica; não autoriza implementação automática.

## NOW

Somente documentação/estado de decisão para consolidação global:

1. manter **Essencial / Pro / Premium** como nomenclatura aprovada;
2. manter preços, anual, limites, demo e landing documentados como decisões travadas da vertical;
3. manter `FEATURE_MATRIX.md` como referência de estado real x plano;
4. manter `premium_demo` + `subscriptionStatus = demo` como conceito aprovado de demonstração;
5. manter a landing/pricing honesta: sem checkout e sem feature planejada anunciada como pronta;
6. encaminhar candidatos globais para comparação entre verticais;
7. **não gerar nem executar GOAL de Codex sem pedido explícito**.

## NEXT

Somente depois do núcleo P0 do produto estar operacional **e** depois da consolidação global definir o contrato compartilhado onde aplicável:

1. catálogo de runtime;
2. serviço de entitlement;
3. feature gates de UI/rotas;
4. validação backend;
5. limites atômicos;
6. usage real;
7. plano manual pelo Platform Owner;
8. status de assinatura e trial;
9. upgrade/downgrade;
10. testes por plano e demo;
11. runbook operacional.

## DEFERRED

- gateway/checkout/webhooks;
- billing automático e cobrança por uso;
- WhatsApp oficial;
- IA/transcrição;
- assinatura digital;
- fiscal/NFS-e;
- multi-unidade;
- qualquer pacote Premium baseado em feature que ainda não exista.

## Regra de escopo

O GOAL clínico atual continua prioritário. Pricing não pode atrasar Auth, tenant resolver, memberships, Rules, CRUD clínico, agenda persistida, anti-double-booking, prontuário e upload clínico real.
