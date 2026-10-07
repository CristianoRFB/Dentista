# Roadmap — fundação revisada

## Fase 0 — Fundação (este ZIP)
- arquitetura Multi-Tenant White-Label;
- Firebase base;
- R2 privado para mídia clínica;
- documentação canônica;
- diagramas;
- landing comercial demonstrativa;
- agenda por profissional + recurso físico;
- central de retorno e pré-cadastro como scaffolds;
- features/limits/usage preparados.

## Fase 1 — Tornar o núcleo realmente operacional
- autenticação real;
- tenant resolver real;
- memberships e Rules validadas em Emulator;
- CRUD de profissionais/pacientes/procedimentos;
- agenda persistida;
- algoritmo transacional de conflito;
- recursos físicos persistidos;
- prontuário + adendos;
- ClinicalPhoto upload real para R2.

## Fase 2 — Experiência clínica
- odontograma interativo;
- plano de tratamento;
- orçamento;
- central de retorno persistida;
- pré-cadastro tokenizado + revisão;
- documentos e templates.

## Fase 3 — Comercial e onboarding
- onboarding de tenant;
- branding configurável;
- landing por clínica/agendamento público;
- planos comerciais reais;
- medição de uso;
- suporte e auditoria completos.

## Depois, apenas com demanda real
- assinatura digital;
- WhatsApp oficial;
- estoque;
- comissões;
- fiscal;
- IA;
- multi-unidade;
- integrações profundas.


## Alinhamento com o Project Core

- manter `GLOBAL_STANDARD`, `VERTICAL_STANDARD` e `PRODUCT_STANDARD` registrados;
- executar `npm run check:standards` ao atualizar documentação estrutural;
- comparar uma nova versão do Core antes de alterar padrões compartilhados;
- preservar regras locais odontológicas quando não houver conflito real.

## Vertical de agendamento — DEFERRED

- lembretes automáticos de consulta;
- confirmação por canal externo;
- regras de opt-in/consentimento;
- integração de provedor e custos.

Esses itens entram somente depois do núcleo persistido e de decisão explícita sobre canal/provedor.

## Protocolo de planos/pricing — 2026-10-06

### NOW
- manter P0 de Auth, tenant resolver, memberships, Rules e núcleo persistido;
- usar `FEATURE_INVENTORY.md` como verdade funcional;
- validar comercialmente R$ 79,90 / R$ 129,90 / R$ 189,90;
- manter `/precos` explicitamente como proposta;
- demo identificada como `premium_demo`;
- não promover feature planejada como pronta.

### NEXT
- plan catalog de runtime;
- `planId`, `subscriptionStatus`, `trialUntil` e overrides persistidos;
- serviço `canUse/getLimit`;
- enforcement frontend + backend;
- limites transacionais;
- usage counters reais;
- testes Essential/Clinic/Advanced/Demo;
- upgrade/downgrade;
- plano manual pelo Platform Owner;
- trial real de 14 dias.

### DEFERRED
- checkout/gateway;
- cobrança automática/webhooks;
- cobrança por uso;
- WhatsApp oficial;
- IA;
- fiscal;
- multi-unidade.


## Pricing / entitlements

O GOAL ativo para execução futura está em `CODEX_GOAL_IMPLEMENTACAO_DENTISTA.txt` na raiz e permanece **CORE_FIRST**. O GOAL antigo de pricing/entitlements é histórico e só poderá ser retomado após novo readiness gate.
