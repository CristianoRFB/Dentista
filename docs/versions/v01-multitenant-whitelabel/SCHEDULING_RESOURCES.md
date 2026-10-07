# Recursos físicos de agenda

Agenda odontológica pode conflitar em duas dimensões:

1. disponibilidade do profissional;
2. disponibilidade de recurso físico.

`ScheduleResource` representa cadeira, sala ou equipamento que precisa ser reservado junto do appointment quando o tenant ativa essa capacidade.

## Regra

Um appointment não pode ser confirmado se houver interseção de horário para:

- o mesmo `professionalId`; ou
- o mesmo `resourceId` quando esse recurso é obrigatório.

Não salvar uma matriz infinita de slots como fonte da verdade. Disponibilidade deve ser derivada de jornada de trabalho, bloqueios, appointments, duração do procedimento e recursos.
