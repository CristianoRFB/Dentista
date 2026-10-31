# PRE-PC COMPLETENESS — OdontoFlow

Atualização incremental: 2026-10-31. Fonte: branch `chore/global-standard-v01-ci-20261027`, não produção.
Não usar esta tabela como prova de homologação hospedada. Sem pacientes reais.

| Módulo GOAL | Código principal | Teste verificável | Estado deste checkpoint |
|---|---|---|---|
| D1 Odontograma | `src/domain/odontogram.ts`, `src/lib/odontogramData.ts`, `src/modules/clinical/PatientOdontogramPage.tsx`, `firestore.rules` | `tests/odontogram.test.ts`, `tests/firestoreRules.test.ts` | CODE_COMPLETE — CI `aaa6580106` verde; ambiente real pendente |
| D2 Tratamento/orçamento | `src/domain/treatmentPlan.ts`, `src/lib/treatmentPlanData.ts`, `src/modules/clinical/PatientTreatmentPage.tsx`, `firestore.rules` | `tests/treatmentPlan.test.ts`, `tests/firestoreRules.test.ts` | CODE_COMPLETE — CI `b06af554` verde, versões append-only e orçamento Pro; ambiente real pendente |
| D3 Central de Retorno | `src/lib/recallData.ts`, `src/lib/recallValidation.ts`, `src/modules/recalls/RecallCenterPage.tsx`, `firestore.rules` | `tests/recallValidation.test.ts`, `tests/firestoreRules.test.ts` | CODE_COMPLETE — CI `7108c582` verde; ambiente real pendente |
| D4 Intake + booking público | `src/modules/public/PublicIntakePage.tsx`, `src/modules/tenant/IntakeReviewPage.tsx`, `src/modules/tenant/BookingInvitesPage.tsx`, `src/lib/publicBookingClient.ts`, `workers/media-api/src/publicBooking.ts`, `workers/media-api/src/index.ts` | `tests/appointmentWorker.test.ts`, `tests/firestoreRules.test.ts` | PARTIAL — pré-cadastro Pro e agendamento Essencial por convite individual, segredo em fragmento de URL com limpeza de histórico, revogação autenticada com auditoria e bloqueio de replay; agenda aberta anônima não habilitada e homologação hospedada pendente |
| D5 Segurança + mídia | `workers/media-api/src/index.ts`, `workers/media-api/src/mediaLifecycle.ts`, `workers/media-api/src/mediaIntegrity.ts`, `workers/media-api/src/mediaUsage.ts`, `src/modules/clinical-media/ClinicalPhotosPage.tsx` | `tests/mediaWorker.test.ts`, `tests/mediaLifecycle.test.ts`, `tests/mediaIntegrity.test.ts`, `tests/mediaUsage.test.ts`, `tests/firestoreRules.test.ts` | PARTIAL — revisão reversível auditada; diagnóstico R2 × Firestore por paciente e medição de bytes de fotos R2 por tenant com paginação autenticada `usage.read`, sem quota/billing. Backup/retention e hospedagem pendentes |
| D6 UX clínica | Menu mobile acessível, pesquisa/paginação de pacientes, agenda por dia, tabelas responsivas e telas clínicas | `tests/patientList.test.ts`, `tests/agendaDate.test.ts`, visual Chromium demo | PARTIAL — foco modal mobile, atalho de pular conteúdo e smoke real Chromium comprovados; QA de leitor de tela/dispositivos físicos pendente |
| D7 CI e sessão PC | `.github/workflows/ci.yml`, `.github/workflows/visual-qa.yml`, `scripts/capture-demo-screenshots.mjs` | GitHub Actions com unit, Rules/Emulator, build, docs e Chromium demo desktop/mobile | PARTIAL — 22 screenshots reais de **DEMO** e manifesto arquivados no Actions #40953800997; smoke de foco, Esc, menu e busca passou; screenshots canônicos/produção e sessão PC pendentes |

## Medição
Não declarar "95%" sem estimar de forma reprodutível o peso dos requisitos executáveis por módulo e verificar os critérios de aceite.
Os status acima não contam documentos, mockups ou diagramas como código implementado.
Depois de cada lote, atualizar esta tabela a partir de SHA + CI do commit correspondente.

## Bloqueios externos distintos
- Screenshots reais de **produção** não arquivadas; 22 telas do runtime demo disponíveis apenas no artefato temporário GitHub Actions #40953800997.
- Provisionamento de Firebase Auth/Firestore, Worker e binding R2 hospedados pendente.
- Validação em ambiente real e QA de dispositivos pendentes.
- Deploy de produção não executado.

## DEFERRED explícito
Checkout, gateway, billing automático, webhooks de cobrança, WhatsApp oficial, fiscal, IA, estoque, comissão, multi-unidade e domínios customizados automáticos.
Essencial R$79,90; Pro R$129,90; Premium R$189,90 — contrato preservado.


## Estimativa ponderada de avanço do código — 31/10/2026 (D4 horários / D5 bytes R2 / D7 26 capturas)

**Estimativa revisada, não certificação.** Escala fechada de 100 pontos de requisitos executáveis distribuídos por risco e complexidade; build/CI não representa homologação. Os pontos de D6 e D7 abaixo consideram a execução bem-sucedida de seus testes de navegador; se falharem, o valor deve ser reavaliado.

| Módulo | Peso | Estimativa implementada | Pendente no código |
|---|---:|---:|---|
| D1 Odontograma | 14 | 14 | Sem pendência P0 codificável constatada |
| D2 Tratamento/orçamento | 14 | 14 | Sem pendência P0 codificável constatada |
| D3 Retornos | 10 | 10 | Sem pendência P0 codificável constatada |
| D4 Intake/booking | 18 | 17 | Solicitação aberta auditada com Turnstile/Rate Limit e fila de recepção; reserva anônima automaticamente confirmada continua intencionalmente bloqueada |
| D5 Mídia/documentos | 18 | 17 | Backup e recuperação manuais por foto com SHA-256, auditoria e bucket R2 secundário opcional; automação/retention, DR integral e validação hospedada pendentes |
| D6 UX/acessibilidade | 16 | 15 | Auditoria automatizada de 26 visualizações demo integrada ao navegador; ainda faltam leitor de tela, outras rotas e testes em dispositivos físicos |
| D7 CI/evidências | 10 | 8 | Manifesto SHA-256, auditoria exportada e artefatos QA com retenção de 30 dias; persistência canônica, runtime hospedado e sessão PC ainda pendentes |
| **Total implementação** | **100** | **95** | **~95% estimado de implementação interna** |

**Avanço geral até produção: ~67%** (95% × 70% = 66,5%, arredondado), considerando peso 70% da implementação e 30% de infraestrutura, testes hospedados, backup, segurança operacional, LGPD e deploy ainda não demonstrados. É uma régua de planejamento conservadora, não um levantamento independente de todos os requisitos legais/clínicos.

**Evidência específica do D5:** `GET /v1/media/integrity` pagina Firestore em lotes de 100 e R2 em lotes de 500, com teto de 3.000 registros por origem, cursores verificados e nenhum DELETE. Falha sem resposta parcial acima do limite; não se trata de snapshot atômico. Os testes `tests/mediaIntegrity.test.ts` e `tests/mediaWorker.test.ts` abrangem paginação, falta de objeto, órfãos candidatos, tenant A × B e cap. Não há reparo/backup automático.

**Evidência específica do D6/D7:** `scripts/capture-demo-screenshots.mjs` captura 22 screenshots reais do aplicativo com dados fictícios (11 rotas × desktop/mobile), mais smoke de foco modal, atalho de pular conteúdo, menu com Escape e busca de pacientes. Visual QA #40953800997 e CI principal #40953806462 aprovados no SHA `8b950a1b3f12569b16b81f0253fdc10e729ae9f7`. Capturas são artefato temporário de GitHub Actions classificado `SCREENSHOT_REAL_DEMO`, não screenshot de produção.

**Ações de infraestrutura ainda não executadas:** provisionar Firebase Auth/Firestore, configurar Workers/R2/segredos, validar segurança real e política de backup, homologar com dados fictícios em staging, revisar screenshots com checklist de privacidade e só então considerar deploy. Não adicionar billing automático nem modificar pricing.


## Checkpoint D4 segurança de convites — 29/10/2026

- **SHA de código aprovado:** `f994ec73ad2050ca3b2e41a408a7a536f60375f2`, [GitHub Actions CI #40956719212](https://github.com/CristianoRFB/Dentista/actions/runs/40956719212) — success.
- Links pessoais novos `/{tenantSlug}/agendar#token=...` e `/{tenantSlug}/cadastro#token=...`; tokens de 256 bits não aparecem na query HTTP nos novos links. A aplicação continua a aceitar links antigos com query e limpa query/fragmento do endereço após a leitura. **Isso não apaga registros/logs criados por URLs antigas antes da página carregar.**
- `src/lib/personalInviteUrl.ts` e `tests/personalInviteUrl.test.ts`: formatos, parsing legado, validação e remoção do segredo sem remover parâmetros não sensíveis.
- `POST /v1/booking/tokens/revoke` e `POST /v1/intake/tokens/revoke`: equipe autenticada, verificação RBAC/tenant, mudança transacional `revokedAt/revokedBy`, audit log, bloqueio de revogação de token já consumido. Agendamento confirmado não é cancelado; submissões de pré-cadastro já recebidas não são apagadas.
- API entrega `Cache-Control: no-store`, `Referrer-Policy: no-referrer` e `X-Content-Type-Options: nosniff`. Formulários públicos não coletam dados clínicos/saúde.
- Visual Chromium com teste dos URLs fragment/legado e 22 capturas de demo: [run #40956427358](https://github.com/CristianoRFB/Dentista/actions/runs/40956427358) — success, SHA `620694914b496234ce90427b22de948f9eb6d58f`; código posterior contém principalmente testes/mocks. Fotos de produção não capturadas.
- **Estimativa interna:** D4 16/18; total 90/100 (antes 88/100). **Avanço geral conservador:** ~63%. São pontuações heurísticas, não homologação regulatória ou indicador automático.

**Pendentes reais:** agendamento aberto sem convite exigiria controles antiabuso adicionais e definição de política de disponibilidade; retenção/backup clínicos, revisão em dispositivos, screenshots canônicos, Firebase/Workers/R2 provisionados e testes hospedados continuam sem comprovação. Sem deploy e sem billing automático.

## Checkpoint D4/D5/D7 — 31/10/2026 (último lote confirmado)

- **SHA de código testado:** `eb6f99f15798ac7a6037baed8409ca6622d4b662`. [CI push #41222771170](https://github.com/CristianoRFB/Dentista/actions/runs/41222771170) e [CI PR #41222774221](https://github.com/CristianoRFB/Dentista/actions/runs/41222774221): **success**. Unit/Worker, typecheck, Firestore Emulator, build e validação de padrões aprovados.
- **D4:** `src/lib/bookingTime.ts` valida e converte horários locais, detecta datas impossíveis e exige janela futura 5 min–60 dias. `PublicBookingPage` usa limites visíveis no `datetime-local`. Teste `tests/bookingTime.test.ts`. Não substitui a validação de conflito/convite no Worker; **agendamento aberto anônimo permanece desabilitado**.
- **D5:** `GET /v1/media/usage?tenantId=...` exige identidade, membership ativa e `usage.read`, conta objetos/bytes R2 do prefixo de pacientes do tenant em páginas de até 500. UI sob demanda no painel do responsável, com continuação de páginas (até 20 por chamada) e atualização de medição completa. Não expõe nomes de arquivos no JSON; rejeita parâmetros extras, escopo inválido, demo e tenants cruzados. Testes `tests/mediaUsage.test.ts`, `tests/mediaWorker.test.ts`. **Leitura sem snapshot atômico**: não equivale a billing, quota aprovada, prova de backup, retenção ou restauração.
- **D7:** teste Chromium com **26 screenshots** do app em modo demonstrativo (13 rotas × desktop/mobile), incluindo formulários reais de agendamento e pré-cadastro por convite com **tokens exclusivamente fictícios** e removidos da barra antes da captura. [Visual QA #41222771156](https://github.com/CristianoRFB/Dentista/actions/runs/41222771156): **success**. São capturas `SCREENSHOT_REAL_DEMO`, não imagens canônicas nem produção.
- **Régua conservadora atual:** D1 14/14, D2 14/14, D3 10/10, D4 16/18, **D5 16/18**, D6 14/16, D7 7/10. **Total 91/100 (~91% implementação interna); ~64% até produção**. Ganho de +1 ponto em D5 por medição implementada e testada. Capturas extras e validação local de horário não fecham os gates pendentes.
- **Próximo código de maior risco:** política/versionamento de backup e recuperação R2; estratégia explícita antiabuso para agendamento sem convite; evidências de QA real em leitor de tela. **Infraestrutura hospedada, segredos, LGPD operacional, backup/restore e deploy continuam sem comprovação; não ativar produção sem validação.** Nenhum preço alterado e nenhum pagamento automático implementado.

## Checkpoint D5 backup clínico — 31/10/2026

- **Último SHA de código deste lote (antes do checkpoint documental):** `5b1a5f2e0bf032ba1881ebbe7714a6e9fe9fe0d5`. Validação definitiva deve usar o CI do HEAD da branch; não aceitar apenas o teste verde do commit anterior.
- Backup por foto: `POST /v1/media/backups` emite cópia R2 privada, em segundo bucket opcional, com SHA-256 do conteúdo e conferência após a escrita. Manifests em `tenants/{tenantId}/patients/{patientId}/clinicalPhotos/{photoId}/backups/{digest}`.
- Catálogo privado paginado `POST /v1/media/backups/list`: somente hash, bytes e data; não retorna backupKey, objectKey, binário, nome clínico ou link público. A UI fica no módulo Fotos Clínicas para dentistas com `clinical.write`.
- Recuperação `POST /v1/media/backups/restore`: exige manifesto, SHA-256 válido, imagem original ausente, justificativa e autorização. Registra intenção antes do R2 PUT e comprovante auditado após verificação. Usa `If-None-Match: *` no R2 para **não sobrescrever um original criado concorrentemente**.
- Backup/recuperação podem operar sobre fotos de paciente inativo mantendo paciente/prontuário inalterados. Platform Owner não ganha acesso por ser administrador; sessão de suporte não concede esta operação.
- **O binding `CLINICAL_MEDIA_BACKUP` não está provisionado nem ativado neste repositório.** Rota falha fechado (503) sem bucket separado. Não há backup automático, retenção, replicação independente de Firestore, restauração integral de tenant nem prova de operação hospedada.
- Testes automáticos de negativas, perda de mídia, concorrência, checksum e isolamento. Runbook em `docs/CLINICAL_MEDIA_BACKUP_RUNBOOK.md`.
- **Nova régua conservadora:** D5 17/18, código 92/100; avanço geral ~64%. Não equivale à homologação ou à prontidão de produção.

## Checkpoint D5/D6/D7 — 31/10/2026 (auditoria de acessibilidade e R2 bounded reads)

**SHA do código validado:** `e0201f3d0d615cb321a9acd19adf59d1b4686435`; [CI push #41232980730](https://github.com/CristianoRFB/Dentista/actions/runs/41232980730), [CI PR #41232984608](https://github.com/CristianoRFB/Dentista/actions/runs/41232984608) e [Visual QA #41232980843](https://github.com/CristianoRFB/Dentista/actions/runs/41232980843) concluídos com **success**.

- **D5 hardening:** `boundedImageBytes` bloqueia objetos R2 cujo tamanho declarado excede 15 MiB *antes* de criar um leitor; em streams sem tamanho confiável, aborta a leitura assim que os bytes recebidos ultrapassam o limite, cancela o leitor e exige contagem exata. Testes em `tests/mediaBackup.test.ts`. Esta melhoria não vale ponto extra de D5: faltam retenção, backups periódicos, DR operacional e validação hospedada.
- **D6 audit:** `scripts/a11y-smoke-audit.mjs` é executado após cada uma das 26 capturas do aplicativo demo em Chromium, mobile e desktop. Verifica nomes acessíveis essenciais em botões, links e formulários; atributos ARIA referenciando IDs existentes; IDs duplicados e `alt` de imagens visíveis. Achados fazem a pipeline falhar e um relatório `ACCESSIBILITY_AUDIT.json` é incluído no artefato.
- **D7 evidência:** capturas são geradas por aplicativo real **em modo demo com dados fictícios**; `SCREENSHOTS_MANIFEST.json` contém SHA-256 por PNG, referência de commit de origem e contagem exata, com retenção configurada para 30 dias. **Não** é arquivamento canônico permanente, imagem de produção, teste assistivo real ou certificação WCAG.
- **Heurística:** D1 14/14; D2 14/14; D3 10/10; D4 16/18; D5 17/18; **D6 15/16; D7 8/10; total 94/100**. Preparo geral estimado **~66%**. Nenhum ajuste de preço, billing, merge na main ou deploy.
- **Próximo bloco realmente pendente:** agendamento aberto sem convite somente com proteção antiabuso e opt-in seguro (não liberado); QA com leitor de tela e dispositivos físicos; verificação do runtime hospedado; backups e retenção reais; evidência visual canônica com controle de privacidade.

## Checkpoint D4 — 31/10/2026 (solicitação pública protegida, sem reserva automática)

**SHA de código testado:** `b74c321973a53e02007382365142a4ad6f612282`. [CI push #41241826209](https://github.com/CristianoRFB/Dentista/actions/runs/41241826209) e [CI PR #41241830594](https://github.com/CristianoRFB/Dentista/actions/runs/41241830594) **SUCCESS**. Validação: **160 testes unitários/Worker e 30 Rules Emulator**, TypeScript, Worker e build aprovados. QA Chromium de 28 capturas tem execução separada; conferir status em HEAD.

- **Novo fluxo sem convite:** `/:tenantSlug/solicitar-agendamento`, `POST /v1/public/booking-requests`, `tenants/{tenantId}/openBookingRequests/{uuid}`. Sem novo paciente, consulta ou lock. Resposta HTTP 202, claramente marcada como **não confirmada**.
- **Defesa em profundidade:** rate-limit de IP/tenant na borda (aproximado, não global exato), Turnstile server-side (hostname + action), origin allowlist, validação estrita de contato/hora, recusa sem configuração de secret/binding, opt-in `publicProfile.openBookingRequestsEnabled` restrito a `tenant_owner`, revalidação atômica em Firestore transaction antes do commit. Token Turnstile e IP não persistem.
- **Recepção:** fila privada com leitura por `appointments.read`, revisão `contacted/dismissed` auditada com `appointments.manage`, sem criar ou cancelar agendamentos automaticamente. Firestore Rules negam criação/exclusão cliente e isolam tenant A de B.
- **Privacidade mínima:** ciência obrigatória do uso de dados para contato, sem campo clínico nem dados de saúde textual, sem alegação de conformidade LGPD automática. Requer política de retenção antes de produção.
- **Configuração deliberadamente pendente e fail-closed:** sitekey frontend `VITE_TURNSTILE_SITE_KEY`, secret Worker `TURNSTILE_SECRET_KEY`, rate limiting binding `OPEN_BOOKING_RATE_LIMITER`, `APP_ORIGIN` hospedado. Instruções em `docs/OPEN_BOOKING_REQUESTS_RUNBOOK.md`; nenhuma chave ou binding de produção provisionado.
- **Régua de planejamento:** D4 17/18 (+1), demais D1 14, D2 14, D3 10, D5 17, D6 15, D7 8; **95/100 código**, **~67% preparo geral**. 1 ponto D4 remanescente exige decisão de produto e operacional para auto-reserva anônima segura e verificada; não tratar interesse de contato como booking finalizado.
