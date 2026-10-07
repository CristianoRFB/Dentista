# GLOBAL CONSOLIDATION HANDOFF

## PRODUCT
SaaS Dentista / OdontoFlow

## STATUS
READY_FOR_GLOBAL_CONSOLIDATION

## OPEN_DECISIONS
0

## APPROVED_PRICING

| Plano | Mensal | Anual | Status |
|---|---:|---:|---|
| Essencial | R$ 79,90 | R$ 862,92 | APROVADO |
| Pro | R$ 129,90 | R$ 1.402,92 | APROVADO |
| Premium | R$ 189,90 | R$ 2.050,92 | APROVADO |

- desconto anual aprovado: 10%;
- implantação padrão na fase de validação: R$ 0;
- migração complexa: Add-on sob orçamento;
- trial futuro: 14 dias sem cartão, somente quando lifecycle de assinatura existir;
- Add-ons externos e storage excedente: sem preço aprovado até custo/provedor/medição real estarem definidos.

## RECOMMENDED_PLAN
**Pro — Recomendado.**

## APPROVED_PLAN_SUMMARY

- **Essencial:** core clínico e operacional para dentista solo/consultório enxuto, com menor capacidade.
- **Pro:** clínica pequena/média; amplia capacidade e adiciona recursos de crescimento como recursos físicos, Central de Retorno, pré-cadastro, comparação de fotos, orçamento, financeiro e relatórios básicos quando disponíveis.
- **Premium:** maior capacidade operacional; recursos avançados só entram como benefício quando realmente implementados.
- **Add-ons:** WhatsApp/lembretes, assinatura digital, IA, fiscal/NFS-e, storage adicional, domínio personalizado e migração complexa.

## APPROVED_LIMITS

| Limite | Essencial | Pro | Premium |
|---|---:|---:|---:|
| Profissionais clínicos | 1 | 3 | 10 |
| Usuários administrativos adicionais | 2 | 6 | 20 |
| Cadeiras/salas/equipamentos | 1 | 5 | 15 |
| Storage clínico* | 10 GB | 50 GB | 200 GB |
| Unidades | 1 | 1 | 1 |

`tenant_owner` não consome a franquia de usuários administrativos adicionais.

`*` Storage 10/50/200 GB é hipótese interna aprovada, mas não deve ser publicado como promessa comercial até validar uso/custo real de R2.

Pacientes, agendamentos e histórico clínico permanecem sem limite artificial.

## GLOBAL_PATTERN_CANDIDATES

- **PlanCatalog** — CANDIDATO_A_PADRAO_GLOBAL
- **EntitlementService** — CANDIDATO_A_PADRAO_GLOBAL
- **FeatureGating** — CANDIDATO_A_PADRAO_GLOBAL
- **Limits** — CANDIDATO_A_PADRAO_GLOBAL
- **DemoMode** — CANDIDATO_A_PADRAO_GLOBAL
- **SubscriptionStatus** — CANDIDATO_A_PADRAO_GLOBAL
- **TenantOverrides** — CANDIDATO_A_PADRAO_GLOBAL
- **UsageMetering** — CANDIDATO_A_PADRAO_GLOBAL
- **TrialLifecycle** — CANDIDATO_A_PADRAO_GLOBAL
- **UpgradeDowngradePolicy** — CANDIDATO_A_PADRAO_GLOBAL
- **PlatformOwnerPlanAssignment** — CANDIDATO_A_PADRAO_GLOBAL

A vertical apenas declara necessidade dessas capacidades. Nenhuma delas é definida aqui como arquitetura global definitiva.

## VERTICAL_ONLY

- prontuário clínico append-only e adendos;
- odontograma orientado a eventos;
- plano de tratamento odontológico;
- fotos clínicas, classificação odontológica e comparação antes/depois;
- receitas, atestados e documentos clínicos odontológicos;
- procedimentos odontológicos e respectivos fluxos clínicos;
- Central de Retorno aplicada ao acompanhamento odontológico;
- regras de integridade, retenção e downgrade que preservam prontuário, pacientes, fotos e histórico clínico;
- limites comerciais específicos desta vertical: 1/3/10 profissionais, 2/6/20 admins adicionais, 1/5/15 recursos físicos e hipótese 10/50/200 GB.

## SHARED_WITH_SOME_VERTICALS

- agenda por profissional e disponibilidade — potencialmente compartilhável com verticais baseadas em atendimento agendado;
- agendamento público — potencialmente compartilhável com algumas verticais de serviços;
- gestão de recursos físicos associados à agenda — reutilizável somente onde sala/cadeira/equipamento for parte real da operação.

Não há decisão de implementação compartilhada nesta etapa.

## NOW

- concluir o núcleo P0 já priorizado da vertical: autenticação/login, tenant resolver, memberships e Rules;
- persistir CRUD essencial de pacientes, profissionais e procedimentos;
- tornar agenda persistida e anti-double-booking confiável;
- implementar prontuário/adendos conforme o modelo clínico aprovado;
- concluir upload clínico privado real e proteção de arquivos;
- manter pricing/feature matrix/documentação alinhados às decisões aprovadas, sem fingir entitlement ativo.

## NEXT

- adotar o contrato global que vier a ser consolidado para PlanCatalog/EntitlementService/FeatureGating/Limits/SubscriptionStatus/DemoMode/TenantOverrides;
- aplicar enforcement confiável de limites por plano;
- medir usage real, especialmente storage R2;
- implementar status/trial/upgrade/downgrade e plano manual pelo Platform Owner;
- criar testes por Essencial/Pro/Premium/Demo e runbook operacional;
- conectar landing/pricing ao catálogo canônico somente quando esse runtime existir.

## DEFERRED

- checkout, gateway, webhooks e billing automático;
- cobrança por uso;
- preço/fornecedor definitivo de WhatsApp oficial;
- IA/transcrição;
- assinatura digital;
- NFS-e/fiscal;
- portal do paciente;
- estoque;
- comissão;
- automações avançadas;
- multi-unidade;
- preço definitivo de storage excedente;
- integrações externas específicas;
- features Premium ainda não maduras.

## TECHNICAL_GAPS

- catálogo de planos ainda não é runtime canônico;
- entitlements e feature gating ainda não são enforceados;
- limites ainda não possuem validação confiável/atômica;
- backend ainda não valida plano/status/limite de forma completa;
- `premium_demo`/`demo` ainda não está integrado a um entitlement engine;
- lifecycle real de assinatura/trial/upgrade/downgrade ainda não existe;
- usage de R2 e outros consumos ainda não é base de cobrança;
- testes específicos por plano/demo/override/status ainda faltam;
- pricing/landing ainda não consomem um catálogo de runtime porque esse contrato global ainda será consolidado.

## ACTIVE_DELIVERABLE

- **Tipo:** ZIP + documentação executiva normalizada.
- **Canônico para consolidação global:** `Dentista_GLOBAL_CONSOLIDATION_READY_v04.zip`.
- **Estrutura canônica interna:** os seis arquivos deste pacote, com `GLOBAL_CONSOLIDATION_HANDOFF.md` como handoff principal.
- **Pacote completo anterior preservado:** `Dentista_OdontoFlow_V2_SaaS_DECISOES_FECHADAS_v03.zip`.
- Nenhum GOAL de Codex é canônico nesta etapa.

## CODEX_STATUS
READY_FOR_VERTICAL_GOAL_LATER

## GLOBAL_CONSOLIDATION_NOTES

- preços e distribuição comercial da vertical estão aprovados e não devem ser reabertos nesta consolidação;
- Pro é o plano comercialmente destacado;
- segurança, isolamento, histórico clínico e integridade nunca são paywall;
- Premium deve monetizar capacidade agora, sem vender feature futura como pronta;
- demo aprovada usa `premium_demo` + `subscriptionStatus = demo`, dados fictícios e nenhuma cobrança;
- storage 10/50/200 GB permanece hipótese interna até validação de custo/uso real do R2;
- downgrade nunca apaga dados clínicos; acima do limite, preservar dados e bloquear apenas nova capacidade quando necessário;
- candidatos globais listados neste handoff são apenas candidatos, não contratos globais definidos;
- agenda profissional/agendamento público podem ter sobreposição com algumas verticais de serviço, mas não existe decisão de compartilhamento de código;
- esta vertical está pronta para comparação global, mas não para execução Codex sem etapa posterior explícita.
