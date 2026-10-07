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
- preservar o foco do núcleo operacional e isolamento;
- auditar toda comunicação contra `FEATURE_INVENTORY.md`;
- validar pricing proposto sem cobrança automática;
- demo `premium_demo`;
- proposta comercial explícita na landing/pricing.

### NEXT
- entitlements de runtime;
- limites e overrides;
- plano manual pelo Platform Owner;
- trial;
- testes por plano;
- upgrade/downgrade.

### DEFERRED
- gateway, checkout e webhooks;
- billing por consumo;
- WhatsApp/IA/fiscal;
- multi-unidade.
