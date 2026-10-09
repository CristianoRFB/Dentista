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

Não estão implementados odontograma, plano de tratamento, billing automático, intake público persistente ou escrita da Central de Retorno. Plans & Entitlements v01 já está implementado conforme o estado descrito nesta versão.


## Extensões após revisão comercial

- `ScheduleResource`: cadeira/sala/equipamento para conflito de agenda;
- `Recall`: retorno clínico planejado;
- `PatientIntakeSubmission`: dados públicos entram em fila de revisão;
- `UsageCounter`: medição futura de integrações com custo variável;
- camada pública de marketing separada da aplicação autenticada.


## Plans & Entitlements v01

`src/commercial/planCatalog.ts` é a fonte canônica local de preços, features implementadas e limites aprovados. `entitlementService.ts` calcula features efetivas a partir de plano, status, overrides e flags operacionais; ausência de flag usa o default do catálogo e `false` desliga. Feature planejada/deferred não é liberada por override.

Platform Owner atribui manualmente `planId`, `subscriptionStatus`, `trialUntil`, `entitlementOverrides` e `limitOverrides`. Cada alteração comercial exige motivo e grava snapshot antes/depois no audit log, sem dados clínicos. `premium_demo` é alias Premium, não plano pago; a demo usa dados fictícios, banner permanente e somente leitura.

Criação/ativação de profissionais, memberships não-owner e recursos físicos passa pelo Worker existente. Contadores por tenant são inicializados e atualizados na mesma transação Firestore; as Rules negam gravação direta do navegador e acesso aos contadores. Desativação continua permitida quando o tenant está acima da nova quota. Pacientes, agendamentos e histórico clínico não têm limites artificiais; downgrade não apaga registros.

Storage é exceção operacional: `getLimit(storageBytes)` retorna `null`, não há quota anunciada ou aplicada até existir medição confiável de bytes e custo R2. Billing automático, checkout e gateway permanecem DEFERRED.
