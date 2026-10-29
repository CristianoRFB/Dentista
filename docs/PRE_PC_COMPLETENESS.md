# PRE-PC COMPLETENESS — OdontoFlow

Atualização incremental: 2026-10-29. Fonte: branch `chore/global-standard-v01-ci-20261027`, não produção.
Não usar esta tabela como prova de homologação hospedada. Sem pacientes reais.

| Módulo GOAL | Código principal | Teste verificável | Estado deste checkpoint |
|---|---|---|---|
| D1 Odontograma | `src/domain/odontogram.ts`, `src/lib/odontogramData.ts`, `src/modules/clinical/PatientOdontogramPage.tsx`, `firestore.rules` | `tests/odontogram.test.ts`, `tests/firestoreRules.test.ts` | CODE_COMPLETE — CI `aaa6580106` verde; ambiente real pendente |
| D2 Tratamento/orçamento | `src/domain/treatmentPlan.ts`, `src/lib/treatmentPlanData.ts`, `src/modules/clinical/PatientTreatmentPage.tsx`, `firestore.rules` | `tests/treatmentPlan.test.ts`, `tests/firestoreRules.test.ts` | CODE_COMPLETE — CI `b06af554` verde, versões append-only e orçamento Pro; ambiente real pendente |
| D3 Central de Retorno | `src/lib/recallData.ts`, `src/lib/recallValidation.ts`, `src/modules/recalls/RecallCenterPage.tsx`, `firestore.rules` | `tests/recallValidation.test.ts`, `tests/firestoreRules.test.ts` | CODE_COMPLETE — CI `7108c582` verde; ambiente real pendente |
| D4 Intake + booking público | `src/modules/public/PublicIntakePage.tsx`, `src/modules/tenant/IntakeReviewPage.tsx`, `src/modules/tenant/BookingInvitesPage.tsx`, `src/lib/publicBookingClient.ts`, `workers/media-api/src/publicBooking.ts`, `workers/media-api/src/index.ts` | `tests/appointmentWorker.test.ts`, `tests/firestoreRules.test.ts` | PARTIAL — pré-cadastro Pro e agendamento Essencial por convite individual, segredo em fragmento de URL com limpeza de histórico, revogação autenticada com auditoria e bloqueio de replay; agenda aberta anônima não habilitada e homologação hospedada pendente |
| D5 Segurança + mídia | `workers/media-api/src/index.ts`, `workers/media-api/src/mediaLifecycle.ts`, `workers/media-api/src/mediaIntegrity.ts`, `src/modules/clinical-media/ClinicalPhotosPage.tsx` | `tests/mediaWorker.test.ts`, `tests/mediaLifecycle.test.ts`, `tests/mediaIntegrity.test.ts`, `tests/firestoreRules.test.ts` | PARTIAL — revisão reversível auditada e comparação paginada R2 × Firestore por paciente (100/500 por página, teto de 3.000 por origem), somente leitura; backup/retention e hospedagem pendentes |
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


## Estimativa ponderada de avanço do código — 29/10/2026 (D6 acessibilidade / D7 22 capturas)

**Estimativa revisada, não certificação.** Escala fechada de 100 pontos de requisitos executáveis distribuídos por risco e complexidade; build/CI não representa homologação. Os pontos de D6 e D7 abaixo consideram a execução bem-sucedida de seus testes de navegador; se falharem, o valor deve ser reavaliado.

| Módulo | Peso | Estimativa implementada | Pendente no código |
|---|---:|---:|---|
| D1 Odontograma | 14 | 14 | Sem pendência P0 codificável constatada |
| D2 Tratamento/orçamento | 14 | 14 | Sem pendência P0 codificável constatada |
| D3 Retornos | 10 | 10 | Sem pendência P0 codificável constatada |
| D4 Intake/booking | 18 | 16 | Agendamento aberto sem convite + proteção antiabuso continuam pendentes |
| D5 Mídia/documentos | 18 | 15 | Backup/retention operacionais, recovery e documentos avançados |
| D6 UX/acessibilidade | 16 | 14 | Leitor de tela, cobertura das demais rotas e dispositivos físicos |
| D7 CI/evidências | 10 | 7 | Persistência visual canônica, runtime hospedado, sessão PC |
| **Total implementação** | **100** | **90** | **~90% estimado de implementação interna** |

**Avanço geral até produção: ~63%** (90% × 70% = 63,0%), considerando peso 70% da implementação e 30% de infraestrutura, testes hospedados, backup, segurança operacional, LGPD e deploy ainda não demonstrados. É uma régua de planejamento conservadora, não um levantamento independente de todos os requisitos legais/clínicos.

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
