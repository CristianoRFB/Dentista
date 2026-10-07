# Arquitetura

Camadas: Platform, Tenant, Scheduling, Patients, Clinical, Billing, Documents, Auth e Shared. Frontend React/Vite; Firebase Auth/Firestore; R2 privado via Worker para mídia clínica.


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
