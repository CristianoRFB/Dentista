# D5 — Runbook de backup clínico R2 (somente implementação, não homologação)

**Status em 31/10/2026:** endpoints e tela na branch de PR, sem deploy de produção. O binding `CLINICAL_MEDIA_BACKUP` **não está configurado**. Os testes rodam somente sobre dados fictícios e mocks; nenhuma cópia real ou recuperação hospedada foi confirmada.

## Escopo

- Cópia manual de **uma foto** clínica por operação, sob controle de dentista com membership ativa e `clinical.write`. Os dados da clínica A não podem acessar B.
- Backup em bucket R2 **privado separado** do original. O Worker não emite URLs públicas. A chave de backup não é enviada no catálogo/UI.
- SHA-256 calculado sobre os bytes originais, verificado em readback da cópia e novamente ao restaurar. Cada foto tem no máximo 15 MiB.
- Manifesto Firestore append-only por `digest`; audit logs append-only em cada cópia/verificação, recuperação solicitada e recuperação verificada.
- A recuperação só é permitida quando o objeto original **não existe** e exige razão explícita. Escrita condicional atômica `If-None-Match: *` recusa substituir imagens criadas concorrentemente.
- Não move, remove, apaga ou rotaciona imagens; os logs não armazenam imagem nem dados clínicos textuais.

## Provisionamento exigido ANTES de usar

1. Criar um segundo bucket R2 não público, independente do bucket `CLINICAL_MEDIA`. Sem custom/public domain, sem credenciais expostas, com identidade/binding mínimo necessário. Separar também o bucket preview.
2. Configurar explicitamente o binding no Wrangler do **Worker já existente**, após aprovação operacional (não foi adicionado automaticamente ao `wrangler.toml` da branch):

   ```toml
   [[r2_buckets]]
   binding = "CLINICAL_MEDIA_BACKUP"
   bucket_name = "odontoflow-clinical-media-backup"
   preview_bucket_name = "odontoflow-clinical-media-backup-preview"
   ```

   Nomes são exemplos de configuração: confirmar disponibilidade e provisionamento antes de usar. Não apontar este binding para o bucket principal nem dar exposição pública.
3. Validar Auth, Firestore, `CLINICAL_MEDIA`, `CLINICAL_MEDIA_BACKUP`, origin allowlist e as permissões de cada tenant em staging. Sem bucket, o Worker responde **503 fail-closed** para cópia/restauração.
4. Fazer teste de ponta a ponta com dados inteiramente fictícios: upload, backup, manifesto, alteração simulada somente do objeto fictício no ambiente de staging, recuperação, hash, trilhas de auditoria e verificação de isolamento de outro tenant.
5. Definir RPO/RTO, periodicidade, retenção conforme obrigações legais, monitoramento, alertas, permissões de operadores e testes regulares de recuperação antes de liberar dados clínicos reais.

## Contratos HTTP

Todas as rotas exigem `Authorization: Bearer <Firebase ID token>`, corpo JSON, limites de tamanho e origin permitida.

- `POST /v1/media/backups`: `{tenantId,patientId,photoId,reason}` com motivo de 12 a 500 caracteres. Retorna `{photoId,digest,sizeBytes,verified,alreadyBackedUp,private}`.
- `POST /v1/media/backups/list`: `{tenantId,patientId,photoId,pageToken?}` e lista de até 50 manifestos sem chaves privadas, com próximo cursor quando necessário.
- `POST /v1/media/backups/restore`: `{tenantId,patientId,photoId,digest,reason}`; somente para original ausente. Retorna `{restored,verified,photoId,digest}` quando comprovado. Erro 409 no arquivo presente, conflito de integridade ou condição concorrente.

**Nunca** automatizar a operação de restauração sem intervenção clínica e avaliação dos logs.

## Limites e falhas deliberadas

- O manifesto Firestore fica **na mesma base operacional**. Se perder Firestore, o endpoint de recuperação não consegue obter esse manifesto; não é um plano de disaster recovery integral. Exigir export independente de Firestore antes de declarar DR pronto.
- O endpoint é manual e de foto individual; **não** cobre agendamento periódico, todas as imagens de todos os pacientes, política automática de retenção, versionamento externo de metadados ou recuperação de banco inteiro.
- Dois sistemas (Firestore e R2) não compartilham transação distribuída. Em erro depois de copiar, pode sobrar objeto privado sem manifesto; não apagar automaticamente. Em erro depois do R2 restore, pode ficar somente o log `clinical_photo.recovery_requested` para reconciliação manual.
- Checksum detecta corrupção de bytes, mas sozinho não prova existência de retenção legal, isolamento de credenciais, disponibilidade de backup externo nem exercício de restauração real.
- A tela só aparece a dentistas com `clinical.write`; backend repete todas as verificações. A UI nunca deve ser tratada como camada de segurança.
- Não adicionar billing, limites comerciais de storage, política de exclusão, webhook ou novos custos sem revisão.

## Checklist para aceite operacional

- [ ] Segundo bucket efetivamente provisionado, privado e configurado
- [ ] Permissões revisadas, suporte Platform Owner sem acesso automático
- [ ] Teste com dois tenants fictícios e paciente inativo
- [ ] SHA-256 readback confirmado após backup **e** restore
- [ ] Original presente / atualização concorrente bloqueiam overwrite
- [ ] Logs auditados e alertas disponíveis
- [ ] Manifestos/banco exportados para local independente
- [ ] RPO/RTO, retenção e obrigações clínicas/LGPD aprovados
- [ ] Procedimento de recuperação supervisionado e executado em staging
- [ ] Validação de produção separada, sem usar pacientes reais nos testes

