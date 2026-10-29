# Acessibilidade e responsividade — baseline GLOBAL-v01

Acessibilidade e responsividade são padrões globais do ecossistema. Este produto já possuía layout responsivo e foco visível; esta revisão formaliza a baseline.

## Implementado

- `<html lang="pt-BR">`;
- viewport responsivo;
- breakpoints para landing, app, mini-site e agendamento;
- foco visível para links, botões e campos;
- skip link para conteúdo principal;
- conteúdo somente para leitor de tela (`.sr-only`);
- redução de animações/transições com `prefers-reduced-motion`;
- labels reais nos formulários existentes;
- navegações principais rotuladas;
- progresso de agendamento com `aria-live`;
- slots de horário com `aria-pressed`;
- tabela da plataforma com `caption` acessível.

## Ainda obrigatório antes de produção

- auditoria por teclado em todas as rotas;
- teste com leitor de tela;
- contraste medido nos estados de badge/status;
- validação de zoom/reflow;
- auditoria automatizada (ex.: axe/Lighthouse) no CI;
- revisão de mensagens de erro e associação `aria-describedby`;
- screenshots reais em desktop/mobile depois do build real.

Esta documentação não deve ser interpretada como certificação de acessibilidade.


## D6 — incrementos de usabilidade mobile (29/10/2026)

- Menu da clínica apresenta rótulos completos também em telas pequenas, sinaliza a rota ativa e tem botão de abrir/fechar com `aria-expanded`, `aria-controls`, foco no fechamento e tecla Esc.
- Links do menu continuam sujeitos às permissões e entitlements; navegação não substitui a validação do backend.
- Tabelas de pacientes, agenda e retornos usam `data-label` em telas pequenas para preservar a identificação de cada campo, sem remover cabeçalhos semânticos.
- Pacientes: pesquisa por nome/contato sem acento, filtros ativo/inativo, paginação de 12 registros por visualização e confirmação antes de inativar.
- Agenda: seleção de dia, avanço/retorno de data, limites de dia civil local (inclusive DST) e confirmação antes de cancelar.
- Casos unitários: `tests/patientList.test.ts`, `tests/agendaDate.test.ts`.

**Limite de evidência:** build e testes unitários/Emulator não equivalem a auditoria de teclado/leitor de tela em dispositivo real. O workflow `.github/workflows/visual-qa.yml` executou Chromium em desktop/mobile com sucesso no [run #40949283614](https://github.com/CristianoRFB/Dentista/actions/runs/40949283614), capturando 12 telas do **runtime demo fictício**. É evidência técnica temporária de tela renderizada, não certificação de acessibilidade, validação com contas hospedadas ou screenshot de produção.
