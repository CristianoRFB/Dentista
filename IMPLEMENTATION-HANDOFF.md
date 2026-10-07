# IMPLEMENTATION HANDOFF

## O que existe

Fundação React/TypeScript, Firebase config via env, regras Firestore iniciais, deny-all no Firebase Storage, Worker R2 inicial, domínio básico, páginas shell, testes unitários puros, 22 diagramas arquiteturais na versão canônica, wireframes históricos e novos wireframes de produto/comercial.

A revisão atual também inclui:

- landing comercial inspirada em boas práticas de apresentação de produto, sem copiar identidade externa;
- páginas públicas de recursos e estrutura de planos;
- mini-site white-label do tenant;
- fluxo demonstrativo de agendamento público;
- pré-cadastro público com revisão obrigatória como decisão arquitetural;
- Central de Retorno;
- cadeira/sala como recurso físico da agenda;
- `UsageCounter` para custos variáveis futuros.

## O que NÃO deve ser assumido pronto

- autenticação visual;
- provisionamento de Platform Owner;
- CRUD real completo;
- transação anti-double-booking no Firestore;
- persistência real da Central de Retorno;
- endpoint confiável para pré-cadastro público;
- confirmação real do agendamento público;
- verificação granular de permissão no Worker R2 (P0 exige conferir `clinical.write`);
- auditoria atômica de todas as mutações;
- regras testadas por Emulator Suite;
- deploy real Cloudflare/Firebase;
- bucket R2 criado;
- preços comerciais definidos;
- dados reais;
- conformidade jurídica/LGPD formal.

## Ordem para o próximo agente

1. `docs/CURRENT.md`;
2. `DECISIONS.md`;
3. `docs/versions/v01-multitenant-whitelabel/PRODUCT_STRATEGY.md`;
4. `docs/versions/v01-multitenant-whitelabel/MARKETING_SITE.md`;
5. `firestore.rules`;
6. `src/domain/*`;
7. diagramas da versão canônica;
8. P0 do `BACKLOG.md`;
9. só então expandir frontend.

## Firebase

Projeto: `dentista-ee9db`. Web config está em `.env.example`. Não adicionar service account ao repo.

## R2

Worker em `workers/media-api/`. Criar buckets e configurar deploy. O Worker nunca deve oferecer URL pública permanente de arquivo clínico.

## Landing e benchmark

O benchmark Codental serve para estudar estrutura de comunicação: benefício primeiro, software visível, recursos claros e planos legíveis. Não copiar marca, textos, preços, imagens ou componentes.

## Revisão de planos/pricing

Foi aplicada auditoria real antes da distribuição comercial. O agente seguinte deve ler, nesta ordem adicional:

1. `FEATURE_INVENTORY.md`;
2. `PRICING_AND_PLANS.md`;
3. `ENTITLEMENTS_DELTA.md`;
4. `COMMERCIAL_DEMO.md`.

### Não assumir pronto

- `planId`/status em tipos e demo são scaffold comercial;
- `pricingProposal.ts` alimenta apenas a página demonstrativa;
- não existe `canUse/getLimit` de runtime;
- não existe validação backend de plano;
- não existe checkout;
- não existe gateway/webhook;
- não existe trial real;
- não existe enforcement de storage/profissionais/recursos.
