# PRE-PC COMPLETENESS — OdontoFlow

Atualização incremental: 2026-10-27. Fonte: branch `chore/global-standard-v01-ci-20261027`, não produção.
Não usar esta tabela como prova de homologação hospedada. Sem pacientes reais.

| Módulo GOAL | Código principal | Teste verificável | Estado deste checkpoint |
|---|---|---|---|
| D1 Odontograma | `src/domain/odontogram.ts`, `src/lib/odontogramData.ts`, `src/modules/clinical/PatientOdontogramPage.tsx`, `firestore.rules` | `tests/odontogram.test.ts`, `tests/firestoreRules.test.ts` | CODE_COMPLETE — CI `aaa6580106` verde; ambiente real pendente |
| D2 Tratamento/orçamento | `src/domain/treatmentPlan.ts`, `src/lib/treatmentPlanData.ts`, `src/modules/clinical/PatientTreatmentPage.tsx`, `firestore.rules` | `tests/treatmentPlan.test.ts`, `tests/firestoreRules.test.ts` | CODE_COMPLETE — CI `b06af554` verde, versões append-only e orçamento Pro; ambiente real pendente |
| D3 Central de Retorno | `src/lib/recallData.ts`, `src/lib/recallValidation.ts`, `src/modules/recalls/RecallCenterPage.tsx`, `firestore.rules` | `tests/recallValidation.test.ts`, `tests/firestoreRules.test.ts` | CODE_COMPLETE — CI `7108c582` verde; ambiente real pendente |
| D4 Intake + booking público | `src/modules/public/PublicIntakePage.tsx`, `src/modules/tenant/IntakeReviewPage.tsx`, `src/lib/intakeClient.ts`, `workers/media-api/src/intakeValidation.ts`, `workers/media-api/src/index.ts`, `PublicBookingPage.tsx` | `tests/appointmentWorker.test.ts`, `tests/firestoreRules.test.ts` | PARTIAL — pré-cadastro Pro seguro e revisão completos em CI `81fb37e6c`; agendamento público real ainda indisponível; hospedagem pendente |
| D5 Segurança + mídia | `workers/media-api/src/index.ts`, `firestore.rules` | `tests/mediaWorker.test.ts`, `tests/firestoreRules.test.ts` | PARTIAL — núcleo protegido; ciclo de vida completo/restauração pendentes |
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
