# FEATURE_MATRIX — SaaS Dentista

> Base comercial: auditoria de pricing produzida em 2026-10-06. Estados técnicos revisados em 2026-10-08 após validação do Core P0.
> Esta atualização não altera preços, limites aprovados ou distribuição comercial.
> Regra: o estado real prevalece sobre plano, marketing e demo.

## Leitura

- **Plano** = menor camada comercial em que a feature deve existir quando estiver pronta. Planos superiores herdam as features inferiores.
- **Interna** = capacidade de plataforma/segurança que não deve ser vendida como diferencial Premium.
- **Add-on** = custo variável, implantação específica ou integração externa.
- **Limites comerciais** foram aprovados nesta vertical; ainda não significam enforcement implementado.

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
| Plataforma | Platform Owner dashboard | IMPLEMENTADA | Interna | tenants, owner inicial, status, branding e suporte |
| White-label | Branding por tenant | IMPLEMENTADA | Essencial | perfil público básico; 1 tenant = 1 identidade |
| Comercial | `tenant.features` + `tenant.limits` | EM IMPLEMENTAÇÃO | Interna | estrutura sem enforcement |
| Comercial | Usage counters | EM IMPLEMENTAÇÃO | Interna | medição real ausente |
| Comercial | Catálogo de planos / assinatura / trial | PLANEJADA | Interna | runtime ausente |
| Comercial | Entitlements efetivos | PLANEJADA | Interna | `canUse/getLimit` ausentes |
| Pacientes | Lista de pacientes | IMPLEMENTADA | Essencial | tenant-scoped; pacientes sem limite artificial |
| Pacientes | CRUD persistido | IMPLEMENTADA | Essencial | criação e inativação; sem exclusão destrutiva |
| Profissionais | Cadastro/CRUD | IMPLEMENTADA | Essencial | criação e inativação; cotas 1 / 3 / 10 ainda sem enforcement |
| Procedimentos | Cadastro/CRUD | IMPLEMENTADA | Essencial | criação e inativação; sem limite comercial definido |
| Agenda | Visualização de agenda | IMPLEMENTADA | Essencial | tenant-scoped; agendamentos sem limite artificial |
| Agenda | Detecção pura de sobreposição/conflito | IMPLEMENTADA | Interna | — |
| Agenda | Validação transacional anti-double-booking | IMPLEMENTADA | Interna | Worker + locks transacionais; obrigatória em todos os planos |
| Agenda | Recursos físicos (cadeira/sala/equipamento) | IMPLEMENTADA | Pro | CRUD e conflito técnico; cotas 1 / 5 / 15 ainda sem enforcement |
| Agenda | Agendamento público | EM IMPLEMENTAÇÃO | Essencial | sem limite artificial de agendamentos |
| Agenda | Lembretes automáticos | DEFERRED | Add-on | provedor/custo/consentimento pendentes |
| Clínica | Prontuário append-only | IMPLEMENTADA | Essencial | registros imutáveis com autoria e auditoria; histórico completo, sem corte por plano |
| Clínica | Adendos de prontuário | IMPLEMENTADA | Essencial | correção auditável por novo registro; integridade sem diferenciação |
| Clínica | Odontograma orientado a eventos | PLANEJADA | Essencial | — |
| Clínica | Plano de tratamento básico | PLANEJADA | Essencial | — |
| Comercial clínica | Orçamentos | PLANEJADA | Pro | — |
| Fotos | Catálogo/busca de classificações clínicas | IMPLEMENTADA | Essencial | — |
| Fotos | Cache local IndexedDB | IMPLEMENTADA | Interna | detalhe técnico, não diferencial |
| Fotos | Upload R2 privado | IMPLEMENTADA | Essencial | Worker autenticado; binding de produção pendente; cotas de 10 / 50 / 200 GB sem enforcement |
| Fotos | Timeline/comparação antes/depois | PLANEJADA | Pro | — |
| Retorno | Central de retorno | EM IMPLEMENTAÇÃO | Pro | — |
| Intake | Pré-cadastro por link | EM IMPLEMENTAÇÃO | Pro | endpoint seguro ainda pendente |
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
| Storage | Armazenamento adicional | PLANEJADA | Add-on | acima de 10/50/200 GB |
| Domínio | Domínio personalizado | PLANEJADA | Add-on | domínio + configuração externa |
| Migração | Migração complexa de outro sistema | PLANEJADA | Add-on | sob orçamento após amostra |
| Multi-unidade | Várias unidades por tenant | DEFERRED | Premium | não ofertar; planos atuais = 1 unidade |

## Limites comerciais propostos

| Limite | Essencial | Pro | Premium |
|---|---:|---:|---:|
| profissionais clínicos/agendas | 1 | 3 | 10 |
| usuários administrativos não clínicos | 2 | 6 | 20 |
| cadeiras/salas/equipamentos | 1 | 5 | 15 |
| mídia clínica incluída | 10 GB | 50 GB | 200 GB |
| unidades | 1 | 1 | 1 |
| pacientes | sem limite artificial | sem limite artificial | sem limite artificial |
| agendamentos | sem limite artificial | sem limite artificial | sem limite artificial |
| histórico clínico | completo | completo | completo |

Nenhuma funcionalidade relevante da auditoria-base foi classificada como **LEGACY** ou **NÃO CONFIRMADA**. Isso não autoriza tratar features planejadas como prontas.
