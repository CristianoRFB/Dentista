# Segurança

Menor privilégio. `permissions[]` é a base das regras. Dados clínicos exigem `clinical.read/write` ou sessão de suporte clínico ativa para Platform Owner. Firestore/Worker são camadas de enforcement; esconder UI não é segurança.

## Regras operacionais verificadas

- Firebase Auth fornece UID; as rotas privadas exigem usuário autenticado, exceto o tenant demo em desenvolvimento explícito.
- Firestore Rules validam `tenantId` do caminho e dos dados, tenant ativo, membership ativa, papel e permission. A role também limita quais permissões podem ser atribuídas.
- Atribuição comercial é exclusiva do Platform Owner, com reason obrigatório e audit before/after de campos comerciais; tenant owners não conseguem editar plano, estado ou overrides.
- O Worker valida plano/status/entitlement e atualiza em transação os contadores privados de profissionais, memberships não-owner e recursos. Rules negam write direto nesses documentos e leitura/escrita de `limitCounters`.
- Rules aplicam o entitlement de `mini_site` e recusam leituras/gravações do recurso Pro Central de Retorno enquanto a feature não tiver implementação completa.
- `premium_demo/demo` não pode criar/alterar membership, paciente, prontuário, adendo, procedimento, agenda, recurso, foto ou outro conteúdo. Dados existentes continuam legíveis com a permissão clínica apropriada.
- Rules recusam writes de appointment e de metadados de foto diretamente pelo navegador; esses fluxos passam pelo Worker. Deletes de pacientes e registros clínicos são negados.
- ClinicalRecord e amendments são criação-only. A Rules exige paciente existente no mesmo tenant; o amendment também deve referenciar o registro original daquele paciente. Auditoria clínica referencia a mutação associada e não armazena conteúdo do prontuário.
- Platform Owner não lê conteúdo clínico sem suporte ativo com ator, tenant, motivo de pelo menos 12 caracteres e expiração; concessão, renovação e revogação geram audit logs.
- Worker verifica assinatura/issuer/audience do Firebase ID token, tenant, membership/permission e vínculo do paciente. Upload restringe JPEG/PNG/WebP, valida bytes e limite técnico de 15 MiB; chave R2 é tenant/patient-scoped.
- Download passa pelo Worker autenticado, retorna `private, no-store`, e não expõe URLs permanentes ou bucket público.
- `storage.rules` continua deny-all; Firebase Storage não armazena mídia clínica.
- segredos de identidade de serviço do Worker são configurados no ambiente do deploy e não pertencem ao frontend, `wrangler.toml` ou repositório.

## Verificação

`npm run test:rules` executa as Rules no Firestore Emulator; `tests/firestoreRules.test.ts` contém dados fictícios Tenant A/B. Os testes do Worker cobrem autorização de mídia com identidade verificada injetada e verificação criptográfica Firebase com assinatura/issuer/audience válidos; a bateria de agenda cobre concorrência de locks. Não há teste contra dados de produção nem migração.

## D5 — mídia clínica: revisão, arquivamento e restauração (2026-10-27)

- `POST /v1/media/{photoId}/review` exige Firebase ID token válido, tenant/patient correspondente, `clinical.write` efetivo ou suporte de plataforma temporário e ativo, além do gating operacional de fotos clínicas. `premium_demo` não grava.
- Payload permite apenas ações `verify/reject/archive/restore`, tags do catálogo conhecido e motivo de 12 a 500 caracteres. O motivo entra no audit log, sem copiar dados clínicos detalhados.
- Mudança feita por transação Firestore, alterando **somente metadados de revisão** por `updateMask` e criando audit log vinculado. `revision` permite rastrear sequência; leituras existentes permanecem protegidas.
- Arquivar é lógico: `lifecycleStatus=archived`, preservando objeto no R2 e chaves clínicas. Restaurar remove a marcação de arquivamento, sem recriar nem apagar o objeto. Rejeitar não remove evidências.
- Browser não tem permissão para criar, editar ou deletar `clinicalPhotos` diretamente; regras permanecem deny-write e leitura clínica tenant-aware.
- **Não comprovado:** política legal/institucional de retenção, reconciliação automática de órfãos Firestore↔R2, restore de backups, homologação hospedada e captura real da UI. `test:rules` + testes de Worker fornecem apenas evidência automatizada.
