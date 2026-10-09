# Decision log

## D-001 — Multi-Tenant por vertical
Odontologia permanece vertical própria.

## D-002 — Tenant isolation
Dados do negócio ficam ligados a `tenantId`; subcoleções sob tenant são o padrão inicial.

## D-003 — Memberships por UID dentro do tenant
`tenants/{tenantId}/memberships/{uid}` simplifica regras e consultas de autorização.

## D-004 — Patient != User
Paciente pode existir sem login.

## D-005 — Professional != User
Profissional pode existir na agenda sem conta de autenticação pronta.

## D-006 — Prontuário append-only
Registro clínico consolidado não é sobrescrito silenciosamente; correção relevante vira adendo.

## D-007 — Odontograma orientado a eventos
Estado atual deve ser explicável pelo histórico.

## D-008 — Fotos clínicas
Metadados no Firestore; binários no R2 privado; cache local via IndexedDB.

## D-009 — Firebase Storage
Deny-all nesta fundação; não usado como storage principal de mídia clínica.

## D-010 — Platform clinical support
Platform Owner administra tudo, mas acesso clínico entra por sessão explícita e temporária de suporte, para reduzir acesso casual e melhorar auditoria.

## D-011 — Docs canônicos
`docs/CURRENT.md` aponta para a única versão arquitetural vigente.

## D-012 — Produto deve aparecer na landing
A comunicação comercial mostra UI e fluxos reais/demonstrativos e traduz módulos em benefícios. Benchmark externo serve como referência de estrutura, nunca como material para cópia.

## D-013 — Agenda pode reservar recurso físico
Cadeira, sala ou equipamento podem participar da validação de conflito quando o tenant habilitar o módulo.

## D-014 — Retorno é entidade própria
Retornos clínicos planejados ficam em `Recall`, com estado e data prevista, em vez de depender apenas de notas livres.

## D-015 — Pré-cadastro requer revisão
Formulário público gera submissão pendente; recepção revisa antes de incorporar dados ao cadastro oficial.

## D-016 — Planos são features + limits
Nomes e preços comerciais não devem controlar lógica de domínio diretamente.

## D-017 — Custos variáveis podem ser medidos
A arquitetura prevê `UsageCounter` por tenant para integrações com custo unitário futuro.


## D-018 — Alinhamento explícito com o SaaS Project Core
O produto registra `CORE_VERSION`, `GLOBAL_STANDARD`, `VERTICAL_STANDARD` e `PRODUCT_STANDARD`. Novas versões do Core devem ser comparadas por delta; não se reimplementa o que já está correto.

## D-019 — Acessibilidade é baseline global
Responsividade existente foi preservada e a baseline de acessibilidade recebeu skip link, suporte a reduced motion e semântica adicional. Isso não equivale a certificação; auditoria completa permanece gate de produção.

## D-020 — Lembretes de agenda ficam DEFERRED
Lembretes pertencem à vertical de agendamento, mas não entram no escopo estrutural atual. Dependem de canal/provedor, custo e consentimento. Registrar agora, implementar depois.

## D-021 — Pricing protocol auditado antes de gating
O protocolo global de planos/pricing foi aplicado por auditoria do estado real. A estratégia comercial desta vertical fica em `FEATURE_INVENTORY.md`, `PRICING_AND_PLANS.md` e `ENTITLEMENTS_DELTA.md`. Nenhuma dessas decisões implica entitlement implementado.

## D-022 — Pricing inicial aprovado
`Essencial R$ 79,90`, `Pro R$ 129,90` e `Premium R$ 189,90`, com 10% de desconto anual. Totais anuais aprovados: R$ 862,92, R$ 1.402,92 e R$ 2.050,92. Valores preservados; atribuição continua manual e não há billing automático.

## D-023 — Demo usa premium_demo
O tenant demonstrativo pode carregar `planId = premium_demo` e `subscriptionStatus = demo`. Isso identifica a finalidade comercial; não significa que feature gating exista.

## D-024 — Segurança e histórico não são diferenciais pagos
Isolamento, integridade clínica, histórico essencial, autenticação segura, regras de acesso e proteção de dados nunca serão degradados por plano.

## D-025 — Downgrade preserva dados
Downgrade não apaga paciente, prontuário, foto ou histórico. Quando houver enforcement, o sistema deve preferir bloquear nova capacidade acima do limite e preservar leitura/exportação apropriada.

## D-026 — Plans & Entitlements v01
PlanCatalog local é a fonte canônica; `premium_demo` é alias Premium com `subscriptionStatus=demo`, dados fictícios e somente leitura. Platform Owner atribui manualmente plano, estado, trial e overrides com motivo e auditoria before/after. Worker e Firestore Rules impõem features e limites; frontend não é camada de segurança.

## D-027 — Storage clínico sem quota pública ou enforcement
10/50/200 GB permanece hipótese interna aprovada. Não publicar, limitar nem cobrar até medir bytes R2 por tenant e validar custo real. Pacientes, agendamentos e histórico clínico continuam sem limite artificial.
