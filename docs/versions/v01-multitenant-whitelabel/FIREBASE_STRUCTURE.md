# Estrutura Firebase — Dentista OdontoFlow V2

## Serviços ativos no desenho do runtime

- Firebase Authentication: login email/senha e UID de usuário/membership.
- Cloud Firestore: tenants, memberships, dados operacionais, prontuário, perfis públicos, auditoria e locks de agenda.
- Firestore Security Rules: enforcement das leituras e mutações do cliente autenticado.
- Firebase Storage: não usado para mídia clínica; `storage.rules` continua deny-all.
- Firebase Emulator: Firestore local para testes das Rules; configuração atual em `firebase.json`: Firestore `8081`, Auth `9098`.

O projeto configurado na amostra do ambiente é `dentista-ee9db`; a configuração Web é carregada por variáveis `VITE_FIREBASE_*`. Chaves públicas de configuração Firebase não substituem autorização. Nenhum secret de serviço pertence ao frontend.

## Coleções e caminhos usados

```text
platformOwners/{uid}
platformSupportAccess/{tenantId}
tenantSlugs/{slug}
tenants/{tenantId}
  memberships/{uid}
  patients/{patientId}
    clinicalRecords/{recordId}
    clinicalRecordAmendments/{amendmentId}
    clinicalPhotos/{photoId}       # somente metadados; bytes em R2
  professionals/{professionalId}
  procedures/{procedureId}
  scheduleResources/{resourceId}
  appointments/{appointmentId}     # writes pelo Worker
  scheduleBlocks/{blockId}
  scheduleLocks/{lockId}            # writes pelo Worker
  auditLogs/{auditId}
  publicProfile/public
```

Entidades de negócio permanecem dentro de `tenants/{tenantId}`; o Ruleset valida que o tenant do caminho e os campos do documento coincidam. Slug resolve apenas configuração pública para o tenant. Perfil público tem allowlist reduzida de campos.

## Rules e índices

- `firestore.rules`: exigir usuário autenticado, tenant ativo, membership ativa, papel e permission; exceção clínica temporária para Platform Owner exige suporte válido.
- Creates/updates sensíveis devem vincular a mutação a `auditLogs` no mesmo batch/transação. Records clínicos não podem ser atualizados/apagados por clientes.
- Writes de appointments e fotos são recusados diretamente no navegador; Worker usa Firestore REST autenticado com identidade de serviço após revalidar autorização e referência.
- `firestore.indexes.json`: índices compostos para appointments por profissional/recurso e horário, pacientes por status/nome, fotos por status/data, recalls e intake scaffold.

## Worker e R2

O Worker valida Firebase ID tokens usando issuer/audience e JWKS do Firebase, consulta tenants/memberships/referências no Firestore REST e grava appointments, locks, logs e metadados por transações. A bucket binding `CLINICAL_MEDIA` aponta para R2 privado. Upload e download exigem autorização clínica e usam chaves tenant/patient-scoped. O Worker é a única camada ativa de entrega dos bytes; não há bucket público nem URL permanente.

Credenciais de serviço do Worker devem ser configuradas como secrets no ambiente Cloudflare. `FIRESTORE_EMULATOR_HOST` é exclusivo para desenvolvimento/testes. O binding e as credenciais de produção ainda não estão provisionados por este GOAL.

## Testes locais

`npm run test:rules` inicia o Firestore Emulator com o Ruleset do repositório e executa `tests/firestoreRules.test.ts`, que semeia tenants A/B fictícios. Não faz conexão com registros clínicos de produção.
