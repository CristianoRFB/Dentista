# FEATURE_MATRIX — SaaS Dentista

> Base comercial: auditoria aprovada em 2026-10-06. Estado técnico atualizado em 2026-10-09 após implementação de Plans & Entitlements.
> Esta atualização preserva preços e limites aprovados; não reexecuta auditoria comercial.
> Regra: o estado real prevalece sobre plano, marketing e demo.

## Leitura

- **Plano** = menor camada comercial em que a feature deve existir quando estiver pronta. Planos superiores herdam as features inferiores.
- **Interna** = capacidade de plataforma/segurança que não deve ser vendida como diferencial Premium.
- **Add-on** = custo variável, implantação específica ou integração externa.
- **Limites comerciais** estão aprovados; profissionais, memberships adicionais e recursos físicos têm enforcement transacional no Worker.
- `PlanCatalog` é a fonte canônica de runtime e pricing. Storage continua sem quota publicada ou aplicada.

| Área | Funcionalidade | Estado real | Plano | Limite / regra |
|---|---|---|---|---|
| Fundação | React + TypeScript + Vite | IMPLEMENTADA | Interna | — |
| Fundação | Firebase Web configurável por env | IMPLEMENTADA | Interna | — |
| Auth | Observação de sessão Firebase | IMPLEMENTADA | Interna | — |
| Auth | Login/logout UI + proteção de rotas | IMPLEMENTADA | Interna | — |
| Multi-Tenant | Modelo `Tenant` + `tenantId` | IMPLEMENTADA | Interna | — |
| Multi-Tenant | Tenant resolver `slug -> tenantId` | IMPLEMENTADA | Interna | — |
| Multi-Tenant | Memberships + RBAC | IMPLEMENTADA | Interna | não diferenciar por plano |
| Segurança | Firestore Security Rules | IMPLEMENTADA | Interna | Emulator; não diferenciar por plano |
| Segurança | Firebase Storage deny-all | IMPLEMENTADA | Interna | não diferenciar por plano |
| Segurança | Sessão de suporte clínico do Platform Owner | IMPLEMENTADA | Interna | acesso temporário auditável |
| Auditoria | Audit logs essenciais do Core P0 | IMPLEMENTADA | Interna | tenants, memberships, branding, suporte, clínica, agenda e mídia; não diferenciar por plano |
| Plataforma | Platform Owner dashboard | IMPLEMENTADA | Interna | tenants, owner inicial, status, branding, suporte e atribuição manual de plano/status/overrides com motivo auditado |
| White-label | Branding por tenant | IMPLEMENTADA | Essencial | perfil público básico; 1 tenant = 1 identidade |
| Comercial | `tenant.features` | IMPLEMENTADA | Interna | flags operacionais; ausência usa default; `false` desliga a feature; prontuário/leitura de fotos não são bloqueados por downgrade |
| Comercial | `tenant.limits` | LEGACY | Interna | não é fonte de quota; limites canônicos vêm do PlanCatalog e `limitOverrides` |
| Comercial | `PlanCatalog` Essencial/Pro/Premium | IMPLEMENTADA | Interna | mensal e anual exatos aprovados; `premium_demo` é alias e não quarto plano pago |
| Comercial | Entitlements efetivos | IMPLEMENTADA | Interna | `getEffectiveEntitlements`, `canUse`, `getLimit`; plano + status + overrides + flag + implementação |
| Comercial | Estados comerciais e trial | IMPLEMENTADA | Interna | atribuição manual; trial exige `trialUntil` explícito de até 14 dias; sem conversão/cobrança automática |
| Comercial | Overrides comerciais | IMPLEMENTADA | Interna | Platform Owner; motivo e snapshots antes/depois sem dados clínicos |
| Comercial | Feature gates de UI e backend | IMPLEMENTADA | Interna | navegação/rotas; Worker e Rules continuam autoridade |
| Comercial | Medição de bytes do storage R2 | EM IMPLEMENTAÇÃO | Interna | capacidade transacional de profissionais/equipe/recursos já tem contadores; bytes R2 ainda não medidos de forma confiável |
| Pacientes | Lista de pacientes | IMPLEMENTADA | Essencial | tenant-scoped; pacientes sem limite artificial |
| Pacientes | CRUD persistido | IMPLEMENTADA | Essencial | criação e inativação; sem exclusão destrutiva |
| Profissionais | Cadastro/CRUD | IMPLEMENTADA | Essencial | criação/ativação transacionais no Worker; cota 1 / 3 / 10; Firestore browser write negado |
| Equipe | Memberships ativos não-owner | IMPLEMENTADA | Essencial | cota 2 / 6 / 20; `tenant_owner` excluído; Worker serializa alteração e auditoria |
| Procedimentos | Cadastro/CRUD | IMPLEMENTADA | Essencial | criação e inativação; sem limite comercial definido |
| Agenda | Visualização de agenda | IMPLEMENTADA | Essencial | tenant-scoped; agendamentos sem limite artificial |
| Agenda | Detecção pura de sobreposição/conflito | IMPLEMENTADA | Interna | — |
| Agenda | Validação transacional anti-double-booking | IMPLEMENTADA | Interna | Worker + locks transacionais; obrigatória em todos os planos |
| Agenda | Recursos físicos (cadeira/sala/equipamento) | IMPLEMENTADA | Essencial/Pro/Premium | primeiro recurso permitido no Essencial; cota 1 / 5 / 15; Worker transacional e bloqueio de bypass; múltiplos começam no Pro |
| Agenda | Agendamento público | EM IMPLEMENTAÇÃO | Essencial | sem limite artificial de agendamentos |
| Agenda | Lembretes automáticos | DEFERRED | Add-on | provedor/custo/consentimento pendentes |
| Clínica | Prontuário append-only | IMPLEMENTADA | Essencial | registros imutáveis com autoria e auditoria; histórico completo, sem corte por plano |
| Clínica | Adendos de prontuário | IMPLEMENTADA | Essencial | correção auditável por novo registro; integridade sem diferenciação |
| Clínica | Odontograma orientado a eventos | PLANEJADA | Essencial | — |
| Clínica | Plano de tratamento básico | PLANEJADA | Essencial | — |
| Comercial clínica | Orçamentos | PLANEJADA | Pro | — |
| Fotos | Catálogo/busca de classificações clínicas | IMPLEMENTADA | Essencial | — |
| Fotos | Cache local IndexedDB | IMPLEMENTADA | Interna | detalhe técnico, não diferencial |
| Fotos | Upload R2 privado | IMPLEMENTADA | Essencial | entitlement e permissão clínica no Worker; acesso a mídia existente preservado; produção sem binding/segredos confirmados |
| Fotos | Timeline/comparação antes/depois | PLANEJADA | Pro | — |
| Retorno | Central de retorno | EM IMPLEMENTAÇÃO | Pro | tela apenas de leitura; entitlement fica indisponível até a rotina operacional estar pronta |
| Intake | Pré-cadastro por link | EM IMPLEMENTAÇÃO | Pro | página demonstrativa sem envio persistente; endpoint seguro pendente; entitlement indisponível |
| Site público | Mini-site white-label do tenant | IMPLEMENTADA | Essencial | perfil público configurável; agendamento público ainda não persiste |
| Documentos | Receitas/atestados/templates básicos | PLANEJADA | Essencial | — |
| Financeiro | Financeiro básico | PLANEJADA | Pro | — |
| Relatórios | Relatórios básicos | PLANEJADA | Pro | — |
| Relatórios | Relatórios avançados | PLANEJADA | Premium | não anunciar antes de existir |
| Financeiro | Financeiro avançado | PLANEJADA | Premium | não anunciar antes de existir |
| Portal | Portal do paciente | DEFERRED | Premium | não ofertar agora |
| Estoque | Controle de estoque | DEFERRED | Premium | não ofertar agora |
| Comissão | Comissão por profissional | DEFERRED | Premium | não ofertar agora |
| Automação | Automações avançadas | DEFERRED | Premium | não ofertar agora |
| Assinatura | Assinatura digital | DEFERRED | Add-on | solução jurídica/técnica pendente |
| WhatsApp | API oficial / automações | DEFERRED | Add-on | preço depende do provedor |
| IA | Transcrição / assistente | DEFERRED | Add-on | custo e privacidade pendentes |
| Fiscal | NFS-e / fiscal | DEFERRED | Add-on | integração não escolhida |
| Storage | Armazenamento adicional | DEFERRED | Add-on | hipótese de 10/50/200 GB não é promessa nem enforcement; medir uso/custo R2 primeiro |
| Domínio | Domínio personalizado | PLANEJADA | Add-on | domínio + configuração externa |
| Migração | Migração complexa de outro sistema | PLANEJADA | Add-on | sob orçamento após amostra |
| Multi-unidade | Várias unidades por tenant | DEFERRED | Premium | não ofertar; planos atuais = 1 unidade |

## Limites comerciais aprovados e enforcement atual

| Limite | Essencial | Pro | Premium |
|---|---:|---:|---:|
| profissionais clínicos/agendas | 1 | 3 | 10 |
| memberships ativos adicionais, todos os papéis exceto `tenant_owner` | 2 | 6 | 20 |
| cadeiras/salas/equipamentos | 1 | 5 | 15 |
| storage clínico (hipótese interna) | 10 GB | 50 GB | 200 GB |
| unidades | 1 | 1 | 1 |
| pacientes | sem limite artificial | sem limite artificial | sem limite artificial |
| agendamentos | sem limite artificial | sem limite artificial | sem limite artificial |
| histórico clínico | completo | completo | completo |

Os limites de storage são hipótese interna aprovada, mas `getLimit(storageBytes)` retorna `null`; não há leitura de bytes por tenant e a página pública não os anuncia. Capacidades clínicas, pacientes, agendamentos e histórico não são apagados em downgrade; novas criações/ativações acima das quotas são recusadas.

Nenhuma funcionalidade relevante da auditoria-base foi classificada como **LEGACY** ou **NÃO CONFIRMADA**. Isso não autoriza tratar features planejadas como prontas.
