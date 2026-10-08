# Modelo de dados

Entidades principais: Tenant, User, Membership, Professional, Patient, Appointment, Procedure, ClinicalRecord, ClinicalRecordAmendment, OdontogramEvent, TreatmentPlan, TreatmentItem, Quote, ClinicalPhoto, AuditLog.

## Coleções em uso pelo Core P0

- `tenantSlugs/{slug}` resolve somente tenants ativos.
- `tenants/{tenantId}` mantém estado e branding básico; subcoleções `memberships`, `patients`, `professionals`, `procedures`, `scheduleResources`, `appointments`, `scheduleBlocks`, `scheduleLocks` e `auditLogs` são escopadas ao tenant.
- `tenants/{tenantId}/patients/{patientId}/clinicalRecords/{recordId}` é append-only; `clinicalRecordAmendments/{amendmentId}` guarda correções relacionadas ao original.
- `clinicalPhotos/{photoId}` sob o paciente guarda metadados e chave de objeto privada. Bytes ficam em R2 privado e são entregues pelo Worker.
- `tenants/{tenantId}/publicProfile/public` contém somente o perfil público da clínica.
- `platformOwners/{uid}` representa acesso global de plataforma; `platformSupportAccess/{tenantId}` registra suporte clínico temporário, motivo, ator, expiração e audit id.
- appointments são gravados pelo Worker, com locks por profissional/recurso/dia e `auditLogs` na transação.

OdontogramEvent, TreatmentPlan, TreatmentItem, Quote, billing e usage comercial permanecem modelagem/scaffold sem rotina operacional neste GOAL.


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
