# Backlog priorizado

## P0 — Segurança e multi-tenancy
- [ ] Auth UI real
- [ ] Memberships persistidas
- [ ] Tenant resolver
- [ ] Firestore Rules testadas no Emulator
- [ ] R2 auth/token flow
- [ ] SupportSession temporária para acesso clínico do Platform Owner
- [ ] AuditLog persistido

## P0 — Núcleo odontológico
- [ ] Patients CRUD
- [ ] Professionals CRUD
- [ ] Procedures CRUD
- [ ] Appointments CRUD
- [ ] conflito transacional por profissional
- [ ] conflito transacional por recurso físico
- [ ] ClinicalRecord + amendments
- [ ] ClinicalPhoto upload/classificação

## P1 — Experiência que diferencia
- [ ] auditoria a11y por teclado + leitor de tela + axe/Lighthouse
- [ ] Odontograma orientado a eventos
- [ ] TreatmentPlan
- [ ] Recall Center persistido
- [ ] Patient intake tokenizado + fila de revisão
- [ ] comparação de fotos clínicas
- [ ] páginas comerciais por recurso conectadas a screenshots reais

## P2 — Gestão
- [ ] Orçamentos
- [ ] financeiro básico
- [ ] relatórios
- [ ] planos/limites reais
- [ ] usage counters reais

## Vertical de agendamento — DEFERRED
- [ ] lembretes automáticos de consulta (depende de canal/provedor/custo/consentimento)

## Não antecipar
- [ ] estoque
- [ ] comissões
- [ ] WhatsApp oficial
- [ ] NFe
- [ ] IA
- [ ] multi-unidade

## Pricing protocol — NEXT
- [ ] persistir plan catalog de runtime
- [ ] persistir subscription state (`trial|active|past_due|suspended|cancelled|demo`)
- [ ] implementar entitlement resolver (`canUse`, `getLimit`)
- [ ] overrides por tenant
- [ ] backend validation para features restritas
- [ ] enforcement transacional de limites
- [ ] usage counters reais
- [ ] fixtures/tests Essential, Clinic, Advanced e Demo
- [ ] downgrade preservando dados
- [ ] plano manual pelo Platform Owner
- [ ] trial real de 14 dias

## Pricing protocol — DEFERRED
- [ ] checkout/gateway
- [ ] webhooks de assinatura
- [ ] cobrança automática
- [ ] cobrança por consumo
