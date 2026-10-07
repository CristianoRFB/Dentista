# Retornos e pré-cadastro

## Central de retorno

`Recall` é uma entidade operacional própria. Não é um lembrete de calendário genérico.

Campos mínimos:

- `tenantId`;
- `patientId`;
- motivo;
- previsão (`dueAt`);
- status;
- profissional opcional;
- último contato opcional.

Estados iniciais: `planned`, `due`, `contacted`, `scheduled`, `dismissed`.

## Pré-cadastro por link

O paciente pode preencher dados antes da consulta sem se tornar automaticamente um `User`.

Fluxo:

1. clínica gera/compartilha link limitado;
2. paciente envia dados;
3. submissão fica `pending_review`;
4. recepção revisa;
5. somente após aprovação os dados são incorporados/mesclados ao Patient.

Evitar que um formulário público escreva diretamente em registros clínicos oficiais.
