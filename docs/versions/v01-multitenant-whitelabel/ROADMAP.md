# Roadmap — estado técnico revisado (2026-10-09)

## Concluído — Core Multi-Tenant + Clínico P0

Firebase Auth UI/guards, tenant resolver, memberships/RBAC, Platform Owner e suporte clínico temporário, Firestore Rules, CRUD tenant-scoped de pacientes/profissionais/procedimentos/recursos, agenda persistida via Worker com locks transacionais, prontuário append-only/adendos, R2 privado, auditoria e white-label básico.

## Concluído — Plans & Entitlements Global Standard v01

PlanCatalog com preços e limites aprovados, entitlement service, gates de feature, atribuição comercial manual auditada, trial explícito de até 14 dias, controles de capacidade no Worker, proteção de demo read-only e atualização da matriz técnica. Não há checkout, gateway ou billing automático.

Antes de produção, o ambiente único da vertical precisa ter credenciais de Worker, projeto Auth/Firestore e binding R2 provisionados, além da origem exata da aplicação. Nenhum serviço pago ou ambiente por tenant é criado por este roadmap.

## Fase 2 — Experiência clínica
- odontograma interativo;
- plano de tratamento;
- orçamento;
- central de retorno persistida;
- pré-cadastro tokenizado + revisão;
- documentos e templates.

Odontograma e plano de tratamento permanecem nesta fase; suas fontes de diagrama são marcadas como futuro e não significam que a funcionalidade esteja ativa.

## Próxima fase — Experiência clínica e onboarding
- odontograma interativo;
- plano de tratamento e orçamento;
- Central de Retorno persistida;
- pré-cadastro tokenizado com revisão;
- documentos e templates;
- agendamento público persistente;
- medição confiável de armazenamento R2 antes de qualquer quota pública.

## Depois, apenas com demanda real
- assinatura digital;
- WhatsApp oficial;
- estoque;
- comissões;
- fiscal;
- IA;
- multi-unidade;
- integrações profundas.


## Alinhamento com o Project Core

- manter `GLOBAL_STANDARD`, `VERTICAL_STANDARD` e `PRODUCT_STANDARD` registrados;
- executar `npm run check:standards` ao atualizar documentação estrutural;
- comparar uma nova versão do Core antes de alterar padrões compartilhados;
- preservar regras locais odontológicas quando não houver conflito real.

## Vertical de agendamento — DEFERRED

- lembretes automáticos de consulta;
- confirmação por canal externo;
- regras de opt-in/consentimento;
- integração de provedor e custos.

Esses itens entram somente depois do núcleo persistido e de decisão explícita sobre canal/provedor.

## Protocolo de planos/pricing — 2026-10-06

### NOW
- preservar o foco do núcleo operacional e isolamento;
- auditar toda comunicação contra `FEATURE_INVENTORY.md`;
- validar pricing proposto sem cobrança automática;
- demo `premium_demo`;
- proposta comercial explícita na landing/pricing.

### NEXT
- screenshot operacional real da página pública de pricing e da atribuição comercial manual, após ambiente configurado; nenhum mockup substitui captura real.

### DEFERRED
- gateway, checkout e webhooks;
- billing automático e cobrança por consumo;
- WhatsApp/IA/fiscal;
- multi-unidade.
