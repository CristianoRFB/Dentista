# Segurança

Menor privilégio. `permissions[]` é a base das regras. Dados clínicos exigem `clinical.read/write` ou sessão de suporte clínico ativa para Platform Owner. Firestore/Worker são camadas de enforcement; esconder UI não é segurança.

## Regras operacionais verificadas

- Firebase Auth fornece UID; as rotas privadas exigem usuário autenticado, exceto o tenant demo em desenvolvimento explícito.
- Firestore Rules validam `tenantId` do caminho e dos dados, tenant ativo, membership ativa, papel e permission. A role também limita quais permissões podem ser atribuídas.
- Rules recusam writes de appointment e de metadados de foto diretamente pelo navegador; esses fluxos passam pelo Worker. Deletes de pacientes e registros clínicos são negados.
- ClinicalRecord e amendments são criação-only. Auditoria clínica referencia a mutação associada e não armazena conteúdo do prontuário.
- Platform Owner não lê conteúdo clínico sem suporte ativo com ator, tenant, motivo de pelo menos 12 caracteres e expiração; concessão, renovação e revogação geram audit logs.
- Worker verifica assinatura/issuer/audience do Firebase ID token, tenant, membership/permission e vínculo do paciente. Upload restringe JPEG/PNG/WebP, valida bytes e limite técnico de 15 MiB; chave R2 é tenant/patient-scoped.
- Download passa pelo Worker autenticado, retorna `private, no-store`, e não expõe URLs permanentes ou bucket público.
- `storage.rules` continua deny-all; Firebase Storage não armazena mídia clínica.
- segredos de identidade de serviço do Worker são configurados no ambiente do deploy e não pertencem ao frontend, `wrangler.toml` ou repositório.

## Verificação

`npm run test:rules` executa as Rules no Firestore Emulator; `tests/firestoreRules.test.ts` contém dados fictícios Tenant A/B. Os testes do Worker cobrem autorização de mídia com identidade verificada injetada e verificação criptográfica Firebase com assinatura/issuer/audience válidos; a bateria de agenda cobre concorrência de locks. Não há teste contra dados de produção nem migração.
