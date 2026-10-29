# PRE-PC COMPLETENESS — OdontoFlow

Atualização incremental: 2026-10-27. Fonte: branch `chore/global-standard-v01-ci-20261027`, não produção.
Não usar esta tabela como prova de homologação hospedada. Sem pacientes reais.

| Módulo GOAL | Código principal | Teste verificável | Estado deste checkpoint |
|---|---|---|---|
| D1 Odontograma | `src/domain/odontogram.ts`, `src/lib/odontogramData.ts`, `src/modules/clinical/PatientOdontogramPage.tsx`, `firestore.rules` | `tests/odontogram.test.ts`, `tests/firestoreRules.test.ts` | CODE_COMPLETE — CI `aaa6580106` verde; ambiente real pendente |
| D2 Tratamento/orçamento | `src/domain/treatmentPlan.ts`, `src/lib/treatmentPlanData.ts`, `src/modules/clinical/PatientTreatmentPage.tsx`, `firestore.rules` | `tests/treatmentPlan.test.ts`, `tests/firestoreRules.test.ts` | CODE_COMPLETE — CI `b06af554` verde, versões append-only e orçamento Pro; ambiente real pendente |
| D3 Central de Retorno | `src/lib/recallData.ts`, `src/lib/recallValidation.ts`, `src/modules/recalls/RecallCenterPage.tsx`, `firestore.rules` | `tests/recallValidation.test.ts`, `tests/firestoreRules.test.ts` | CODE_COMPLETE — CI `7108c582` verde; ambiente real pendente |
| D4 Intake + booking público | `src/modules/public/PublicIntakePage.tsx`, `src/modules/tenant/IntakeReviewPage.tsx`, `src/modules/tenant/BookingInvitesPage.tsx`, `src/lib/publicBookingClient.ts`, `workers/media-api/src/publicBooking.ts`, `workers/media-api/src/index.ts` | `tests/appointmentWorker.test.ts`, `tests/firestoreRules.test.ts` | PARTIAL — intake Pro completo e agendamento Essencial via convite pessoal persistente com locks e token único; aberto sem convite não habilitado; ambiente hospedado pendente |
| D5 Segurança + mídia | `workers/media-api/src/index.ts`, `workers/media-api/src/mediaLifecycle.ts`, `workers/media-api/src/mediaIntegrity.ts`, `src/modules/clinical-media/ClinicalPhotosPage.tsx` | `tests/mediaWorker.test.ts`, `tests/mediaLifecycle.test.ts`, `tests/mediaIntegrity.test.ts`, `tests/firestoreRules.test.ts` | PARTIAL — revisão reversível auditada e varredura diagnóstica R2 × Firestore por paciente, limitada e sem exclusão; varredura paginada global, retenção/backup e hospedagem ainda pendentes |
| D6 UX clínica | Telas existentes de agenda, pacientes, clínico, fotos, retorno e odontograma | Build/CI, QA navegador pendente | PARTIAL |
| D7 CI e sessão PC | `.github/workflows/ci.yml` | GitHub Actions com unit, Rules/Emulator, build, docs | PARTIAL — CI existe; teste hospedado, screenshots e sessão PC não realizados |

## Medição
Não declarar "95%" sem estimar de forma reprodutível o peso dos requisitos executáveis por módulo e verificar os critérios de aceite.
Os status acima não contam documentos, mockups ou diagramas como código implementado.
Depois de cada lote, atualizar esta tabela a partir de SHA + CI do commit correspondente.

## Bloqueios externos distintos
- Screenshots reais não arquivadas.
- Provisionamento de Firebase Auth/Firestore, Worker e binding R2 hospedados pendente.
- Validação em ambiente real e QA de dispositivos pendentes.
- Deploy de produção não executado.

## DEFERRED explícito
Checkout, gateway, billing automático, webhooks de cobrança, WhatsApp oficial, fiscal, IA, estoque, comissão, multi-unidade e domínios customizados automáticos.
Essencial R$79,90; Pro R$129,90; Premium R$189,90 — contrato preservado.


## Estimativa ponderada de avanço do código — 29/10/2026

**Estimativa, não certificação de produto pronto.** O denominador são 100 pontos de implementação interna, escolhidos para refletir esforço/risco dos sete módulos D1–D7 (não quantidade de arquivos/linhas). Uma etapa parcial recebe apenas pontos proporcionais ao escopo efetivamente codificado e testado, com falhas de staging separadas.

| Módulo | Peso | Pontos estimados | Observação para os pontos não atribuídos |
|---|---:|---:|---|
| D1 Odontograma | 14 | 14 | Código e testes; produção não incluída nesta régua |
| D2 Tratamento | 14 | 14 | Código e testes; produção não incluída nesta régua |
| D3 Retornos | 10 | 10 | Código e testes; produção não incluída nesta régua |
| D4 Intake/agendamento | 18 | 14 | Agenda aberta sem convite e controles antiabuso ainda não implementados |
| D5 Mídia/documentos | 18 | 13 | Reconciliação paginada/retention/backup e documentos ainda incompletos |
| D6 UX e acessibilidade | 16 | 12 | QA leitor de tela, múltiplos dispositivos e UX de demais rotas |
| D7 CI/evidências | 10 | 5 | Sessão PC real, screenshots persistentes e execução hospedada pendentes |
| **Total código** | **100** | **82** | **~82% implementação interna estimada** |

**Avanço geral até produção estimado em ~58%** usando 70% de peso para código interno (82% × 0,70 = 57,4 pontos) e 30% para validações/infraestrutura operacional ainda não comprovadas (0 ponto atribuível no checkpoint para essas exigências). Não é percentual de deploy nem prontidão clínica certificada.

Separar evidência: `SCREENSHOT_REAL_DEMO` de Chromium é prova de tela renderizada em Vite com dados fictícios, armazenada como artefato temporário do Actions se o job executar; não é screenshot hospedado de produção, diagrama ou imagem conceitual. Não declarar sucesso antes de o workflow comprovar.
