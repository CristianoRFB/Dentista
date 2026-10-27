# Status

- Fundação: criada e revisada após benchmark comercial
- Repo legado: inexistente/vazio
- Frontend React/Vite: executável; Core P0 implementado
- Landing/comercial: conceitual, com status real/futuro explícito
- Firebase Auth/Firestore: integração via env e Emulator para Rules
- Firestore Rules: enforcement tenant/RBAC/clínico validado
- Worker agenda + R2 privado: autorização e transações implementadas
- Diagramas: 22 fontes + renders
- Wireframes/mockups: base anterior + novos fluxos comerciais
- Agenda por recursos físicos: modelagem inicial
- Central de Retorno: criação/atualização interna por equipe autorizada, auditoria e vínculo opcional com agendamento (Pro/Premium); validação em produção pendente
- Pré-cadastro por link: implementação de convite privado, token de uso único e revisão com audit log em CI/Emulator; sem prontuário criado automaticamente; ambiente real pendente
- Medição de custos variáveis: modelagem inicial
- Produção: não configurada
- Seed real: não há cliente real comprovado nem migração
- Auth UI: Firebase login/logout implementados

## Core operacional — 2026-10-08

- login/logout por Firebase Auth e rotas privadas implementados;
- resolução `slug → tenantSlugs → tenant ativo → membership/RBAC` implementada;
- Platform Owner implementado para criar, listar, ativar/suspender tenant, configurar branding e abrir/revogar suporte clínico com auditoria;
- Rules por tenant e permissão, prontuário append-only, adendos e auditoria validados no Firestore Emulator;
- CRUD tenant-scoped para pacientes, profissionais, procedimentos e recursos; agenda gravada pelo Worker;
- concorrência de agenda serializada por locks de profissional/recurso/dia em transações Firestore;
- prontuário P0 e upload/download privado em R2 protegidos por autorização clínica;
- verificação final em 2026-10-08: typecheck da aplicação e do Worker, 51/51 testes unitários, 17/17 testes de Rules/Emulator, build, standards, diagramas, leads e docs:check passaram;
- testes cobrem decisões dos guards de autenticação/Platform Owner, resolução de slug e tenant, membership, suporte temporário, validação de agendamento, conflitos por profissional/recurso/bloqueio, remarcação e cancelamento; o Emulator executa criação/inativação pela camada tenant-scoped, além de isolamento cruzado e concorrência de locks;
- tenant resolver exige correspondência exata entre o slug da rota, o documento de slug e o tenant ativo; o guard do Platform Owner vincula a verificação assíncrona ao UID atual e só reconhece status explicitamente `active`; o Emulator cobre provisionamento auditado de tenant, slug, branding, suspensão e owner inicial, concessão/revogação do suporte clínico e nega prontuário/adendo sem paciente real do mesmo tenant;
- login/logout, resolução do tenant e dashboard foram exercitados no navegador com conta e tenant fictícios descartáveis no Emulator;
- produção ainda não configurada: falta provisionar URLs/segredos do Worker, bucket R2 e projeto Auth/Firestore conforme `DEPLOYMENT.md`;
- screenshots reais não foram arquivados: o aplicativo foi executado e a interface do tenant foi inspecionada, mas a política do navegador bloqueou salvar a captura no workspace e proibiu tentativas equivalentes; `SCREENS.md` registra a limitação por tela;
- quatro imagens em `generated/` foram criadas com ImageGen e são somente conceitos/mockups fictícios, sem valor de evidência do runtime.

## Fora do estado operacional

- Central de Retorno: fluxo interno persistido, auditado e protegido por Rules/entitlements; sem envio automático de mensagens ou consentimento presumido;
- pré-cadastro/agendamento público para tenants reais: indisponíveis neste estágio;
- odontograma: mapa FDI com eventos append-only, correção auditada e tela clínica na branch; tratamento e propostas com versões clínicas imutáveis e orçamento Pro/Premium implementados em CI; validação hospedada pendente;
- billing, checkout e cobrança automática: DEFERRED;
- quota/storage R2: não medidos, não anunciados e não aplicados;
- produção: ainda depende de credenciais/configuração externa e validação de ambiente;
- screenshot real: página `/precos` inspecionada em demo local e exibida nesta sessão, mas não arquivada; demais telas pendentes; mockups não são evidência de runtime.

- Project Core v01: revisado/alinhado;
- Standards tracking: GLOBAL-v01 / APPOINTMENT-v01 / DENTIST-v01;
- acessibilidade GLOBAL-v01: baseline aplicada; auditoria completa pendente;
- lembretes automáticos de agenda: DEFERRED.

## Plans & Entitlements — execução 2026-10-09

- preços e limites aprovados preservados sem nova auditoria;
- PlanCatalog canônico ligado à página de pricing e ao runtime;
- status, trial manual e overrides comerciais atribuídos pelo Platform Owner com motivo e auditoria before/after;
- `premium_demo/demo` é alias read-only e não plano pago;
- entitlements e gates no frontend, Worker e Rules;
- quotas transacionais de profissionais, memberships não-owner e recursos físicos; writes diretos de browser bloqueados;
- downgrade não apaga dados; nova capacidade é recusada quando excede quota e desativação segue disponível;
- pacientes, agendamentos e histórico clínico sem limite artificial;
- storage 10/50/200 GB continua hipótese interna, sem quota pública ou enforcement;
- gateway, checkout e billing automático continuam DEFERRED.

## Implementação incremental — retornos (27/10/2026)

- Implementado na branch de continuação: formulário de retorno, estados, busca/paginação local, gravação transacional auditada e associação opcional com agendamento do paciente.
- Autorização: `recalls.read`/`recalls.manage`, recurso `recall_center` a partir do Pro ou override explícito; demo Premium só leitura; Essencial padrão sem acesso.
- Integridade: paciente/agenda tenant-scoped, rastreio `lastAuditLogId`, sem exclusão física; testes assertivos de Firestore Emulator e negativos A/B.
- Limite conhecido: paginação ainda client-side, sem paginação de consulta no Firestore para bases muito grandes; não há envio externo nem captura de screenshot real arquivada.

## Odontograma — implementação incremental (27/10/2026)

- Mapa dentário FDI permanente/decíduo, seleção por teclado, histórico por dente/superfície e registro clínico atribuído ao usuário autenticado.
- `odontogramEvents` dentro do paciente, sem update/delete e com correção por novo evento; audit log transacional.
- Firestore Rules restringem por `clinical.read`/`clinical.write`, paciente do tenant, paciente ativo na escrita, demonstração somente leitura e auditoria obrigatória.
- Não há diagnóstico automático. Capturas reais/QA em navegador hospedado e infraestrutura de produção continuam pendentes.
