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

## Checkpoint D6/D7 — 22 screenshots demo e teclado (29/10/2026)

Continuar na branch `chore/global-standard-v01-ci-20261027` sem reset ou merge automático. Último SHA de código comprovado: `8b950a1b3f12569b16b81f0253fdc10e729ae9f7`. [CI principal](https://github.com/CristianoRFB/Dentista/actions/runs/40953806462) e [QA visual](https://github.com/CristianoRFB/Dentista/actions/runs/40953800997) aprovados nesse SHA.

D6: `TenantShell` recebeu foco inicial depois da transição do menu mobile, contenção de Tab/Shift+Tab no diálogo, saída com Esc, devolução do foco ao acionador, bloqueio de scroll de fundo e link de teclado para pular ao conteúdo clínico. O teste Chromium executou essas verificações.

D7: o visual QA cobre **11 rotas em desktop e mobile**, gerando **22 screenshots reais do aplicativo com dados fictícios** e manifesto `SCREENSHOT_REAL_DEMO`. [Artefato Actions 12933500262](https://github.com/CristianoRFB/Dentista/actions/runs/40953800997/artifacts/12933500262) é temporário (14 dias); não são capturas de produção nem arquivos canônicos revisados.

A estimativa ponderada do código sobe de 86/100 para **88/100** e o avanço geral conservador para **~62%**. Os pesos e limitações estão em `docs/PRE_PC_COMPLETENESS.md`. Ainda falta homologação real, revisão de teclado/leitor de tela em dispositivos, política de retenção/backup e restauração de mídia, provisionamento Firebase/Worker/R2, screenshots canônicos e deploy — **não realizados**. Não alterar preços e limites nem implementar billing automático.

## Checkpoint D4 — revogação auditada e privacidade de URLs (29/10/2026)

Partir do **SHA mais recente validado no PR**. O código anterior já foi confirmado no CI do SHA `f994ec73ad2050ca3b2e41a408a7a536f60375f2` ([run #40956719212](https://github.com/CristianoRFB/Dentista/actions/runs/40956719212)); QA visual das duas páginas e 22 telas demo com teste de token na URL foi confirmado em [run #40956427358](https://github.com/CristianoRFB/Dentista/actions/runs/40956427358). Documentação pode receber commit posterior, que exige seu próprio CI.

D4 implementado neste lote: helper `personalInviteUrl.ts` cria URLs individuais com fragmento `#token=...`, sem query no novo link; páginas aceitam links antigos, removem token da barra após captura e usam `Referrer-Policy: no-referrer`. Os Workers devolvem cabeçalhos ant-cache e ant-sniff. Links antigos podem permanecer em logs anteriores à execução do JavaScript; não prometer retroatividade.

`/v1/booking/tokens/revoke` e `/v1/intake/tokens/revoke` permitem revogação transacional por equipe autorizada, com `revokedAt/revokedBy` e audit log; não apagam registros clínicos, submissões já recebidas ou consultas confirmadas. UI de recepção/agenda possui confirmação explícita. Testes incluem replay, used vs revoked, negação entre tenants, preservação e simulação correta de `updateMask`.

Régua `docs/PRE_PC_COMPLETENESS.md`: D4 passa a 16/18, implementação interna estimada **90/100**, projeto até produção **~63%**. Permanecem por fazer o agendamento aberto sem convite com antiabuso, retenção e backup real de fotos, QA físico/a11y, screenshots canônicos, provisionamento Firebase/Worker/R2, staging e deploy. Sem billing automático; pricing e limites comerciais não foram modificados.

## Checkpoint 31/10/2026 — código do agendamento e medição R2

Prosseguir do SHA **`eb6f99f15798ac7a6037baed8409ca6622d4b662`**, CI push [#41222771170](https://github.com/CristianoRFB/Dentista/actions/runs/41222771170), CI PR [#41222774221](https://github.com/CristianoRFB/Dentista/actions/runs/41222774221) e Chromium [#41222771156](https://github.com/CristianoRFB/Dentista/actions/runs/41222771156) aprovados. Branch atual continua `chore/global-standard-v01-ci-20261027`, PR #1 aberto sem merge nem deploy.

- D4: validação de horário local e DST via `bookingTime.ts`, limites no formulário e testes; agendamento aberto continua pendente.
- D5: medição R2 de bytes por tenant, paginada e read-only, protegida por membership `usage.read`. UI dashboard em MiB com indicador de medição parcial/complete. Não executar limites/quota, backup automático ou cobrança baseado nessa medição.
- D7: 26 screenshots **de demo fictício** e smoke de tokens removidos dos endereços.
- Estimativa `docs/PRE_PC_COMPLETENESS.md`: implementação 91/100; preparo de produção ~64%, ambos heurísticos. Sem ambiente hospedado e backup/restore ainda.

A próxima execução deve ler apenas o delta desde este SHA, não reanalisar D1–D3 nem alterar tabela de preços ou billing.

## Checkpoint D5 — backup R2 codificado (31/10/2026)

A partir do SHA de código `5b1a5f2e0bf032ba1881ebbe7714a6e9fe9fe0d5`, a branch possui endpoints manuais de backup, catálogo e recuperação de mídia clínica com checksum SHA-256, dupla trilha de auditoria para recuperação, segundo bucket **opcional e não configurado**, CAS atômico no R2, e UI restrita a dentistas. Testes cobrem escopo A×B, sem autorização, paciente inativo, hash adulterado, original existente e concorrência. Valide o HEAD e CI antes de afirmar implementação aprovada.

Leia `docs/CLINICAL_MEDIA_BACKUP_RUNBOOK.md` antes de configurar bucket, jamais disponibilize dados reais em preview, nunca execute produção sem DR/retention e validação operacional. Não confundir arquivamento lógico do prontuário com backup/restore de arquivo. Métrica ajustada a 92% implementação, ~64% geral; nada na main/deploy.

## Continuação verificada — 31/10/2026 (R2 / Chromium / acessibilidade)

Começar de `e0201f3d0d615cb321a9acd19adf59d1b4686435` ou do SHA mais recente da mesma branch. CI push [#41232980730](https://github.com/CristianoRFB/Dentista/actions/runs/41232980730), CI PR [#41232984608](https://github.com/CristianoRFB/Dentista/actions/runs/41232984608) e QA visual [#41232980843](https://github.com/CristianoRFB/Dentista/actions/runs/41232980843) aprovaram o código.

1. D5: stream R2 bounded/cancelado com leitura limitada a 15 MiB e bytes conferidos; testes negativos acrescentados, sem mudar retenção.
2. D6: auditoria automatizada de elementos visíveis nas 13 rotas demo × 2 viewports; **não é WCAG nem leitor de tela**.
3. D7: 26 screenshots reais de demo com SHA-256 por arquivo; `ACCESSIBILITY_AUDIT.json`; artefato Actions por 30 dias (não canônico permanente).
4. Estimativas internas por peso: **94/100** código; **~66% geral**. Permanecem D4 open booking antiabuso, D5 DR e backup periódico, D6 testes assistivos físicos, D7 hosted/canonical. No merge/deploy.

A próxima sessão deve ler somente alterações posteriores ao HEAD, preservar D1–D3, preços e regras de segurança.

## Continuação D4 — 31/10/2026 (opt-in público protegido)

**SHA de implementação:** `b74c321973a53e02007382365142a4ad6f612282`. CI push [#41241826209](https://github.com/CristianoRFB/Dentista/actions/runs/41241826209), PR [#41241830594](https://github.com/CristianoRFB/Dentista/actions/runs/41241830594), ambos aprovados. 160 testes unitários/Worker + 30 regras no emulador; screenshot QA Chromium deve ser checado separadamente.

Novo `src/modules/public/OpenBookingRequestPage.tsx`, alterações em `TenantPublicSite`, `BookingInvitesPage`, `publicBookingClient`, `openBookingRequest.ts`, `Worker index.ts`, `firestore.rules` com proteção Turnstile/rate-limit/opt-in e transação; **solicitação de contato, sem confirmar horário**. Ciência para contato obrigatória. `docs/OPEN_BOOKING_REQUESTS_RUNBOOK.md` explica dependências de staging e riscos. Código interno estimado **95/100**, geral **~67%**.

Últimos pontos de código: política segura para reserva pública anônima (não ativar sem disponibilidade comprovada, contato verificado e antifraude robusta), automação de backups/retention/DR, QA assistiva/hosted e evidência visual canônica. Não repetir D1–D3. Não merge/deploy; preços inalterados.

## Continuação D5 incremental — 31/10/2026 (batch + verify)

A partir do SHA testado `85cc2b909fe264e80a22fe6932e7254e05a78e69`, alterações na branch de PR #1:

- `mediaBackup.ts`: `validateBackupBatchInput` com 1–5 fotos únicas e escopo estrito; `index.ts`: `/v1/media/backups/batch` com preflight e resultado por foto e `/v1/media/backups/verify` somente leitura mesmo com original faltante.
- Frontend `ClinicalPhotosPage` / `r2Client`: seleção paginada de lote e conferência sem restauração.
- R2: metadados privados `originalObjectKey` em novos backups; Firestore Rules: deny explícito no subcaminho `/backups/{sha256Digest}`.
- Testes adicionados em `mediaBackup.test.ts`, `mediaWorker.test.ts`, `firestoreRules.test.ts`. Consultar CI e visual QA mais recentes para confirmar; não repetir análises antigas.
- Métrica heurística revisada **95,5% interno (~96%), 67% geral**. Nenhuma automação destrutiva, billing, ajuste de preço, merge ou deploy. Resta automação/retention/DR de D5 e infraestrutura/QA.
