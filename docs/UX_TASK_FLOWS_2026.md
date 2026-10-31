# Revisão UX/UI aplicada — OdontoFlow V2 (31/10/2026)

## Bases pesquisadas
- W3C WCAG 2.2: https://www.w3.org/TR/wcag/ — navegação consistente, alvo de toque, foco, ajuda consistente e rótulos.
- USWDS Form: https://designsystem.digital.gov/components/form/ — campos em ordem lógica e mensagens claras.
- USWDS Progress Easily: https://designsystem.digital.gov/patterns/complete-a-complex-form/progress-easily/ — revelação progressiva, mobile e redução da sobrecarga.
- Nielsen Norman Group, Recognition and Recall (2024): https://www.nngroup.com/articles/recognition-and-recall/ — reconhecer opções é mais fácil que memorizar caminhos.

Estas são fontes de princípios, não testes do sistema ou validação clínica. As mudanças abaixo foram derivadas também da leitura do código.

## Implementado
- Clínica: menu por tarefas (Visão geral, Atendimento, Solicitações e convites, Organização da clínica), títulos mais claros, posição atual e ajuda sempre acessível.
- Permissões: navegação e atalhos calculados pelos direitos e recursos já habilitados, sem aumento de privilégios. Testes de permissões e função contextual.
- Equipe e responsável: painel inicial com opções de próxima tarefa, sem expor dados de outro tenant.
- Plataforma: pesquisa de clínicas por nome/slug/nome público, sem gravar nem carregar pacientes, com resultados e indicador de quantidade. Criação e suporte em seções recolhíveis, atalhos para seções, JSON avançado recolhido.
- Pacientes: formulário de cadastro opcional/recolhível e ação para limpar filtros vazios. Busca permanece como foco.
- Visitantes: convites esclarecem que pré-cadastro não é reserva, e que a confirmação ocorre após validação do horário.
- Celular: grupos de navegação no drawer, links de tamanho confortável, foco visível, cartão de ajuda e redução de movimento.

## Verificações
- TypeScript, Worker, build, regras Firestore e unit tests continuam no CI.
- Testes de modelo de navegação e pesquisa administrativa em tests/workspaceNavigation.test.ts e tests/platformClinicSearch.test.ts.
- QA de navegador cobre 15 rotas de demonstração, duas larguras, menu, foco, busca e tela de ajuda (30 capturas). Relatório não é certificação WCAG.

## O que ainda exige validação externa
- Testes moderados com dentistas, recepcionistas e administradores reais (tempo por tarefa, erros e compreensão).
- Navegadores/dispositivos físicos e leitores de tela.
- Homologação de administrador autenticado em staging e testes com dados fictícios.
- Análise formal WCAG completa e adequações operacionais LGPD.

Nenhum plano, cobrança, regra RBAC, dado clínico ou deploy de produção foi modificado. A estimativa anterior de implementação interna (95,5%) e preparação geral (~67%) não aumenta só por melhorias de apresentação.
