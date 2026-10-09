# IMPLEMENTATION HANDOFF

## O que existe

Fundação React/TypeScript, Firebase config via env, Core P0 tenant-scoped, Firestore Rules e Emulator Suite, Firebase Storage deny-all, Worker com agenda transacional e mídia R2 privada, domínio básico, telas públicas e administrativas, testes automatizados e 22 diagramas da versão canônica.

A revisão atual também inclui:

- landing comercial inspirada em boas práticas de apresentação de produto, sem copiar identidade externa;
- páginas públicas de recursos e estrutura de planos;
- mini-site white-label do tenant;
- fluxo demonstrativo de agendamento público;
- pré-cadastro público com revisão obrigatória como decisão arquitetural;
- Central de Retorno;
- cadeira/sala como recurso físico da agenda;
- `UsageCounter` para custos variáveis futuros.
- Core P0 operacional: Firebase Auth, tenant/RBAC, auditoria clínica, prontuário append-only, agenda transacional e mídia R2 privada;
- Plans & Entitlements v01: catálogo canônico, feature gates, limites transacionais e atribuição comercial manual auditada pelo Platform Owner.

## O que NÃO deve ser assumido pronto

- o CRUD completo de todos os domínios; pacientes, profissionais, procedimentos e recursos têm fluxos persistidos, mas há áreas ainda em scaffold;
- escrita persistente da Central de Retorno, pré-cadastro público ou agendamento público para tenants reais;
- odontograma, plano de tratamento, financeiro e relatórios, que permanecem planejados;
- cobrança automática, checkout, gateway ou conversão automática de trial; todos estão fora do escopo atual;
- medição de bytes e quota de storage R2; 10/50/200 GB é hipótese interna e não pode ser anunciada ou aplicada;
- ambiente de produção: no estado verificado em 2026-10-09, o Firestore ainda não foi criado, o Console retornou erro ao iniciar a criação, Wrangler/Cloudflare não estão autenticados e `APP_ORIGIN` permanece local;
- dados reais de clientes ou conformidade jurídica/LGPD formal.

## Ordem para o próximo agente

1. `docs/CURRENT.md` e a versão canônica indicada;
2. `DECISIONS.md`, `docs/versions/v01-multitenant-whitelabel/STANDARDS.md` e `CORE_ALIGNMENT.md`;
3. `STATUS.md`, `PLANS_AND_ENTITLEMENTS.md`, `FEATURE_MATRIX.md` e `DEPLOYMENT.md` para o estado atual;
4. preservar o Core P0 já implementado e as decisões LOCAL da vertical;
5. não refazer a auditoria comercial nem alterar preços/limites sem nova decisão explícita.

## Firebase

Projeto: `dentista-ee9db`. Web config está em `.env.example`. Não adicionar service account ao repo.

## R2

Worker em `workers/media-api/`. Criar buckets e configurar deploy. O Worker nunca deve oferecer URL pública permanente de arquivo clínico.

## Landing e benchmark

O benchmark Codental serve para estudar estrutura de comunicação: benefício primeiro, software visível, recursos claros e planos legíveis. Não copiar marca, textos, preços, imagens ou componentes.

## Revisão de planos/pricing

Auditoria comercial e aprovação de preços/limites já foram concluídas. O estado atual está registrado em:

1. `docs/versions/v01-multitenant-whitelabel/PLANS_AND_ENTITLEMENTS.md`;
2. `docs/versions/v01-multitenant-whitelabel/FEATURE_MATRIX.md`;
3. `docs/versions/v01-multitenant-whitelabel/PRICING_AND_PLANS.md` e `DECISOES_PRICING.md`.

O `PlanCatalog` é a fonte canônica dos valores e limites aprovados. Entitlements são resolvidos por plano/status, flags e overrides; UI, Worker e Firestore Rules aplicam os gates. O Platform Owner atribui plano, status, trial e overrides manualmente, com motivo e snapshots auditados before/after. `premium_demo/demo` é apenas alias de demonstração read-only.

Checkout, gateway, webhook e billing automático continuam inexistentes por decisão de escopo. Storage não tem enforcement até medição confiável; capacidades de profissionais, memberships adicionais e recursos físicos têm enforcement transacional no Worker, com bypass direto negado nas Rules.
