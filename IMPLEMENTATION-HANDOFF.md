# IMPLEMENTATION HANDOFF

## O que existe

Fundação React/TypeScript, Firebase config via env, Core P0 tenant-scoped, Firestore Rules e Emulator Suite, Firebase Storage deny-all, Worker com agenda transacional e mídia R2 privada, domínio básico, telas públicas e administrativas, testes automatizados e 22 diagramas da versão canônica.

A revisão atual também inclui:

- landing comercial inspirada em boas práticas de apresentação de produto, sem copiar identidade externa;
- páginas públicas de recursos e estrutura de planos;
- mini-site white-label do tenant;
- fluxo demonstrativo de agendamento aberto sem convite; reserva real por convite individual com paciente existente usa Worker e locks transacionais;
- pré-cadastro público com revisão obrigatória como decisão arquitetural;
- Central de Retorno;
- cadeira/sala como recurso físico da agenda;
- `UsageCounter` para custos variáveis futuros.
- Core P0 operacional: Firebase Auth, tenant/RBAC, auditoria clínica, prontuário append-only, agenda transacional e mídia R2 privada;
- Plans & Entitlements v01: catálogo canônico, feature gates, limites transacionais e atribuição comercial manual auditada pelo Platform Owner.

## O que NÃO deve ser assumido pronto

- o CRUD completo de todos os domínios; pacientes, profissionais, procedimentos e recursos têm fluxos persistidos, mas há áreas ainda em scaffold;
- agendamento aberto e anônimo sem convite continua indisponível; agendamento persistente por convite pessoal Essencial e pré-cadastro Pro já têm Worker, UI e testes. Provisionamento e homologação hospedada pendentes;
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

## Checkpoint D4 — pré-cadastro (2026-10-27)

Na branch de continuação `chore/global-standard-v01-ci-20261027`, o endpoint Worker emite tokens opacos individuais de 7 dias para equipes com `intake.manage` em planos Pro/Premium. `POST /v1/public/intake` consome cada token uma única vez em transação e grava solicitação `pending_review`. Firestore Rules impedem acesso ao segredo, escrita pública direta e aprovação sem audit log. `/app/pre-cadastros` permite a recepção aprovar/rejeitar, sem criação automática de prontuário ou cadastro definitivo. Testes no Worker e no Firestore Emulator cobrem replay, expiração, acesso entre tenants, negativa no Essencial e auditoria. A demo permanece somente leitura.

Pendentes: agendamento aberto sem convite e proteção antiabuso, telas hospedadas e screenshots reais, provisionamento Firebase/Worker/R2 e deploy de produção. Não adicionar billing automático ou alterar preços comerciais.

## Checkpoint D5 — mídia clínica (2026-10-27)

Na branch `chore/global-standard-v01-ci-20261027`, fotos privadas mantêm seu objeto R2 original. O Worker autenticado acrescentou revisão `verify/reject` e ciclo lógico `archive/restore`, com autor, motivo e audit log transacional; a atualização Firestore usa `updateMask`, preservando campos históricos originais. A galeria oferece ações por profissional autorizado, busca/filtragem de arquivadas e limpeza de `blob:` URLs ao atualizar ou desmontar a tela. A demo permanece somente leitura.

Os testes `tests/mediaLifecycle.test.ts` e `tests/mediaWorker.test.ts` exercitam a transição reversível, RBAC, negativa entre tenants, ausência de exclusão do bucket e preservação dos campos históricos. O Core, D1–D4 e os contratos de pricing/limites continuam intactos.

**Ainda não realizado:** provisionamento real de R2/Worker/Firebase, política operacional de backup/retention, reconciliação de objetos órfãos, captura de screenshots reais e homologação hospedada. Não confundir arquivamento lógico com exclusão definitiva ou restauração de disaster recovery.

## Checkpoint D5 paginado + QA D6/D7 — 29/10/2026

A continuação na mesma branch adicionou leitura paginada do inventário de fotos do paciente, comparando Firestore (100/página) com R2 (500/página), limite de 3.000 itens por origem e bloqueio de loops de cursor. `GET /v1/media/integrity` permanece somente leitura, autenticado e condicionado a autorização clínica; classifica arquivos ausentes, metadados fora do escopo e possíveis órfãos. **A comparação não usa snapshot atômico**, e nenhum resultado autoriza apagar objetos, reescrever metadados ou afirmar sucesso de backup/restauração. Para mais de 3.000 itens, recusa relatório incompleto.

D6: menu responsivo, acessibilidade de navegação mobile, busca/paginação de pacientes, agenda por dia e tabelas legíveis em telas pequenas já implementados. D7: a rotina `scripts/capture-demo-screenshots.mjs` valida seis rotas em desktop e mobile, captura 12 screenshots reais do **demo fictício** e agora também testa menu/Escape e busca de pacientes no Chromium. Workflow visual CI verificado em `40950921973`; artefatos temporários GitHub Actions não são screenshots de produção ou arquivo canônico revisado.

A régua detalhada de progresso vive em `docs/PRE_PC_COMPLETENESS.md`: 86/100 pontos estimados para implementação interna e ~60% de avanço geral ponderado, **não** certificação independente. A infraestrutura hospedada, retenção/backup reais, testes com leitor de tela, QA em dispositivos, capturas canônicas revisadas e deploy permanecem separados. Não executar deploy, billing ou mudança de pricing nesta continuidade.
