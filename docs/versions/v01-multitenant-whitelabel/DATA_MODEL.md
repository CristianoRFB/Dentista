# Modelo de dados

Entidades principais: Tenant, User, Membership, Professional, Patient, Appointment, Procedure, ClinicalRecord, ClinicalRecordAmendment, OdontogramEvent, TreatmentPlan, TreatmentItem, Quote, ClinicalPhoto, AuditLog.


## Entidades acrescentadas na revisão

### ScheduleResource
`id, tenantId, name, type(chair|room|equipment), active`

### Recall
`id, tenantId, patientId, professionalId?, reason, dueAt, status, lastContactAt?`

### PatientIntakeSubmission
`id, tenantId, tokenId, status, name, phone?, email?, submittedAt`

### UsageCounter
`tenantId, period, metric, value`


## Metadados comerciais propostos

A interface `Tenant` ganhou campos opcionais de scaffold:

```text
planId?
subscriptionStatus?
trialUntil?
entitlementOverrides?
```

Isso NÃO significa entitlement implementado. A fonte de autorização atual continua sendo RBAC/Rules; pricing ainda não controla runtime.

Estados propostos:

```text
trial | active | past_due | suspended | cancelled | demo
```

`UsageCounter` já existia como modelagem inicial e continuará sem escrita pública até existir backend confiável.
