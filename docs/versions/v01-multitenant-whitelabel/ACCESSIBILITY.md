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
