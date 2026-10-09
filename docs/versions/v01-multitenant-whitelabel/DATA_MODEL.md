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


## Estado comercial e entitlement

`Tenant` contém o estado comercial atribuído manualmente pelo Platform Owner:

```text
planId?
subscriptionStatus?
trialUntil?
entitlementOverrides?
limitOverrides?
```

`planId` aceita `essential`, `pro` e `premium`; `premium_demo` é alias exclusivo de demo. `entitlementOverrides` contém booleanos e `limitOverrides` contém inteiros não negativos ou `null` (sem limite), sem chave para storage.

Estados comerciais:

```text
trial | active | past_due | suspended | cancelled | demo
```

`tenants/{tenantId}/limitCounters/{professionals|resources|memberships}` é privado ao Worker e mantém contagem atômica para as quotas aplicadas. Não é fonte pública para UI.

`UsageCounter` segue sem medição confiável de bytes R2. `storageBytes` retorna `null`; a hipótese interna de 10/50/200 GB não é aplicada ou anunciada.
