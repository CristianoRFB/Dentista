# Arquitetura

Camadas: Platform, Tenant, Scheduling, Patients, Clinical, Billing, Documents, Auth e Shared. Frontend React/Vite; Firebase Auth/Firestore; R2 privado via Worker para mídia clínica.

## Runtime Core Multi-Tenant + Clínico P0

- `AuthProvider` mantém estado Firebase Auth; `AuthRequired` protege as rotas privadas e `PlatformOwnerRequired` valida o documento global do operador.
- `TenantAccessProvider` resolve slug público, tenant ativo e membership por UID; permissões saem da membership e são revalidadas pelas Rules e pelo Worker.
- os documentos operacionais ficam sob `tenants/{tenantId}`; IDs e consultas privadas derivam do contexto resolvido.
- as Rules exigem tenant ativo, membership ativa e allowlist de papel/permissão. Escritas críticas usam pares de entidade + `auditLogs` em uma transação/batch.
- a UI usa Firestore diretamente para CRUD permitido. Agendamentos e cancelamentos passam pelo Worker, que confere token Firebase, autorização, referências do tenant, bloqueios, conflitos e locks transacionais.
- notas clínicas consolidadas são imutáveis; correções criam `clinicalRecordAmendments` com motivo e auditoria.
- fotos clínicas são objetos R2 privados. Firestore guarda metadados; o Worker autoriza upload e download por token e permissão; não há URL permanente pública.
- Platform Owner não recebe acesso clínico por ser operador. Acesso requer documento `platformSupportAccess/{tenantId}` válido, motivo e expiração.
- modo demonstrativo só é habilitado em desenvolvimento com `VITE_USE_DEMO_DATA=true`; seus dados fictícios não são usados como origem operacional conectada.

Não estão implementados odontograma, plano de tratamento, billing, entitlements, intake público persistente ou escrita da Central de Retorno.


## Extensões após revisão comercial

- `ScheduleResource`: cadeira/sala/equipamento para conflito de agenda;
- `Recall`: retorno clínico planejado;
- `PatientIntakeSubmission`: dados públicos entram em fila de revisão;
- `UsageCounter`: medição futura de integrações com custo variável;
- camada pública de marketing separada da aplicação autenticada.


## Camada comercial proposta

A revisão de pricing adiciona **arquitetura de especificação**, não entitlement funcional:

```text
Pricing proposal / plan catalog
        ↓
Tenant subscription metadata
        ↓
Effective entitlements (NEXT)
        ↓
┌───────────────────────┐
│ UI feature gates      │
│ backend/Worker checks │
│ limit enforcement     │
└───────────────────────┘
```

Nesta v01 somente a proposta comercial e metadados opcionais foram adicionados. O resolver efetivo de entitlement e a validação de backend permanecem `NEXT`.
