# EVOLVE 07 — preparação de release, NÃO aprovado

Candidato de desenvolvimento: PR #4, SHA de código 99f519dcf636151ff180456c32276a6e0b7cd213. Não realizar merge/deploy/cobrança sem autorização específica e aprovação dos gates.

## Infraestrutura conferida nesta sessão (UTC 27/11/2026)
- Pages dentista-saas.pages.dev: deployment a3922170-b0e9-42f1-ba40-0fa0f620ad93 em 13/10/2026, commit 2beddc467f5e91a5b4a27ac271daa3e385666079. Não corresponde ao candidato.
- Worker odontoflow-clinical-media: bindings APP_ORIGIN e identidade Firebase presentes, CLINICAL_MEDIA/CLINICAL_MEDIA_BACKUP ausentes. Valores de segredos não coletados. R2 GET buckets HTTP 403, código 10042, habilitação via painel requerida. Sem autorização para ativar cobrança.
- Firebase dentista-ee9db: configuração no código; plano, Auth/Firestore hospedados e regras efetivas não verificados. Não afirmar custo recorrente garantido nem operação real.

## Gates de liberação
- [ ] CI integral e Chromium no SHA final, inspeção de capturas e reteste visual.
- [ ] Triple Verification das jornadas; teste A×B e papéis com dados fictícios em ambiente isolado.
- [ ] Aprovar custo/cotas e provisionar R2 privado primário e backup sem URLs públicas; validar segregação e checksum/restore.
- [ ] Homologar Firebase Auth/Firestore, revogação de sessão, regras efetivas, credencial de menor privilégio, Turnstile/rate-limit quando usados.
- [ ] Validar retenção/DR para dados PROTECTED_REGULATED; sem autoexclusão clínica; requisitos legais e operacionais confirmados pelo responsável.
- [ ] Testes assistivos, teclado, mobile real, performance e observabilidade sem PII.
- [ ] Conferir PlanCatalog, atribuição manual, termos e escopo comercial; não apresentar features planejadas como prontas. Essencial R$79,90, Pro R$129,90, Premium R$189,90; anual R$862,92/R$1.402,92/R$2.050,92. Sem checkout ou billing. Sem quota artificial de pacientes/agenda/histórico nem quota pública R2.
- [ ] Aprovação expressa do responsável; registrar release commit e rollback antes do deploy. Rollback de código não reverte dados. Smoke após deploy, sem dados reais de paciente.

Estado final: BLOCKED para release comercial e produção. Financeiro/relatórios/documentos planejados, portal/WhatsApp/IA/fiscal/multi-unidade deferred. Não anunciar 90% comprovado; não há nova auditoria ponderada completa.
