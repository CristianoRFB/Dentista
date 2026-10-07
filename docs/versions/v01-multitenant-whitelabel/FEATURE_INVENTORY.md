# FEATURE INVENTORY — SaaS Dentista

> **SNAPSHOT DE AUDITORIA:** preservado como fonte da refatoração executiva. Para decisão atual, use `FEATURE_MATRIX.md`.

> Revisão: 2026-10-06  
> Base auditada: `Dentista_OdontoFlow_V2_SaaS_Foundation_CORE_v01_ATUALIZADO.zip`  
> Objetivo: registrar o estado REAL do produto antes de distribuir capacidades entre planos.

## Legenda de estado

- `IMPLEMENTADA`: existe código funcional no escopo indicado e há evidência local suficiente para tratá-lo como implementado.
- `EM_IMPLEMENTACAO`: existe scaffold/modelagem/código parcial, mas a capacidade não está pronta para produção.
- `PLANEJADA`: existe decisão/documentação, sem implementação operacional suficiente.
- `DEFERRED`: deliberadamente adiada.
- `LEGACY`: herdada de produto antigo e não aplicável nesta fundação.
- `DESCARTADA`: decisão explicitamente removida.
- `NAO_CONFIRMADA`: não foi possível provar no artefato auditado.

> Importante: esta fundação tem várias telas demonstrativas. Tela demo não transforma uma capacidade de negócio em `IMPLEMENTADA`.

## Inventário funcional

| Área | Feature | Estado real | Classificação comercial | Evidência atual / observação |
|---|---|---|---|---|
| Fundação | React + TypeScript + Vite | IMPLEMENTADA | PLATFORM_INTERNAL | App e rotas existem no pacote |
| Fundação | Firebase Web por env | IMPLEMENTADA | PLATFORM_INTERNAL | `src/lib/firebase.ts` + `.env.example` |
| Auth | Observação de sessão Firebase | IMPLEMENTADA | PLATFORM_INTERNAL | `AuthProvider` acompanha `onAuthStateChanged` |
| Auth | Login/logout UI + proteção de rotas | PLANEJADA | PLATFORM_INTERNAL | não existe UI/proteção real |
| Multi-Tenant | Modelo `Tenant` + `tenantId` | EM_IMPLEMENTACAO | PLATFORM_INTERNAL | tipos, rules e demo; persistência real ausente |
| Multi-Tenant | Tenant resolver `slug -> tenantId` | PLANEJADA | PLATFORM_INTERNAL | documentado; não resolvido em runtime |
| Multi-Tenant | Memberships + RBAC | EM_IMPLEMENTACAO | PLATFORM_INTERNAL | templates + Security Rules; sem fluxo real persistido |
| Segurança | Firestore Security Rules | EM_IMPLEMENTACAO | PLATFORM_INTERNAL | regras existem; Emulator ainda não validado |
| Segurança | Firebase Storage deny-all | IMPLEMENTADA | PLATFORM_INTERNAL | `storage.rules` bloqueia uso por padrão |
| Segurança | Sessão de suporte clínico do Platform Owner | PLANEJADA | PLATFORM_INTERNAL | regra/modelo conceitual sem fluxo operacional |
| Auditoria | Audit logs | PLANEJADA | PLATFORM_INTERNAL | regras previstas, sem pipeline persistido |
| Plataforma | Platform Owner dashboard | EM_IMPLEMENTACAO | PLATFORM_INTERNAL | UI demo baseada em `demoTenants` |
| White-label | Branding por tenant | EM_IMPLEMENTACAO | CORE | modelo existe; site demo ainda hardcoded |
| Comercial | `tenant.features` + `tenant.limits` | EM_IMPLEMENTACAO | PLATFORM_INTERNAL | estrutura existe, sem gating |
| Comercial | Usage counters | EM_IMPLEMENTACAO | PLATFORM_INTERNAL | interface + Rules; sem escrita/medição real |
| Comercial | Plan catalog / assinatura / trial | PLANEJADA | PLATFORM_INTERNAL | não existia antes desta revisão |
| Comercial | Feature entitlements reais | PLANEJADA | PLATFORM_INTERNAL | sem `canUse/getLimit` e sem validação backend |
| Pacientes | Lista de pacientes | EM_IMPLEMENTACAO | CORE | página lê dados demo |
| Pacientes | CRUD persistido | PLANEJADA | CORE | backlog P0 |
| Profissionais | Cadastro/CRUD | PLANEJADA | CORE | tipo existe; sem UI/persistência |
| Procedimentos | Cadastro/CRUD | PLANEJADA | CORE | tipo + Rules; sem UI/persistência |
| Agenda | Visualização de agenda | EM_IMPLEMENTACAO | CORE | página demo |
| Agenda | Detecção pura de sobreposição/conflito | IMPLEMENTADA | PLATFORM_INTERNAL | `availability.ts` + testes unitários |
| Agenda | Validação transacional anti-double-booking | PLANEJADA | PLATFORM_INTERNAL | explicitamente pendente |
| Agenda | Recursos físicos (cadeira/sala/equipamento) | EM_IMPLEMENTACAO | GROWTH | modelo + página demo + conflito puro |
| Agenda | Agendamento público | EM_IMPLEMENTACAO | CORE | fluxo visual demo, sem gravação confiável |
| Agenda | Lembretes automáticos | DEFERRED | ADD-ON/GROWTH | depende de canal/provedor/custo/consentimento |
| Clínica | Prontuário append-only | PLANEJADA | CORE | tipos/rules/docs; sem fluxo real de registro |
| Clínica | Adendos de prontuário | PLANEJADA | CORE | tipo/rules; sem UI/persistência |
| Clínica | Odontograma orientado a eventos | PLANEJADA | CORE | decisão/diagramas; sem implementação operacional |
| Clínica | Plano de tratamento | PLANEJADA | CORE | documentação/diagramas; sem domínio persistido no código |
| Comercial clínica | Orçamentos | PLANEJADA | GROWTH | Rules/modelo documental; sem UI operacional |
| Fotos | Catálogo/busca de classificações clínicas | IMPLEMENTADA | CORE | busca local testada |
| Fotos | Cache local IndexedDB | IMPLEMENTADA | CORE | utilitário funcional |
| Fotos | Upload R2 privado | EM_IMPLEMENTACAO | CORE | client + Worker existem; Worker ainda precisa permissão granular e deploy |
| Fotos | Timeline/comparação antes-depois | PLANEJADA | GROWTH | somente conceito/landing |
| Retorno | Central de retorno | EM_IMPLEMENTACAO | GROWTH | UI demo + entidade; sem persistência |
| Intake | Pré-cadastro por link | EM_IMPLEMENTACAO | GROWTH | UI demo; sem endpoint tokenizado confiável |
| Site público | Mini-site white-label do tenant | EM_IMPLEMENTACAO | CORE | UI demo; dados ainda hardcoded |
| Documentos | Receitas/atestados/templates | PLANEJADA | CORE/GROWTH | roadmap, sem implementação |
| Financeiro | Financeiro básico | PLANEJADA | GROWTH | backlog P2 |
| Relatórios | Relatórios básicos | PLANEJADA | GROWTH | backlog P2 |
| Relatórios | Relatórios avançados | PLANEJADA | ADVANCED | não operacional |
| Portal | Portal do paciente | DEFERRED | ADVANCED | documentado como futuro |
| Estoque | Controle de estoque | DEFERRED | ADVANCED | “não antecipar” |
| Comissão | Comissão por profissional | DEFERRED | ADVANCED | “não antecipar” |
| Assinatura | Assinatura digital | DEFERRED | ADD-ON/ADVANCED | depende de solução jurídica/técnica |
| WhatsApp | API oficial / automações | DEFERRED | ADD-ON | custo variável e provedor ainda indefinidos |
| IA | Transcrição/assistente | DEFERRED | ADD-ON | custo variável e privacidade precisam ser definidos |
| Fiscal | NFS-e/NF | DEFERRED | ADD-ON | integração ainda não escolhida |
| Multi-unidade | Várias unidades por tenant | DEFERRED | ADVANCED | arquitetura evita bloquear, mas não implementa |

## Leitura comercial do inventário

### CORE

O plano de entrada precisa resolver uma clínica de verdade, portanto o alvo do `Essencial` inclui:

- pacientes;
- agenda;
- prontuário;
- odontograma;
- fotos clínicas;
- plano de tratamento básico;
- site público e agendamento online;
- segurança, histórico clínico e isolamento sem diferenciação por plano.

Várias dessas capacidades ainda estão `PLANEJADA` ou `EM_IMPLEMENTACAO`. Portanto **não podem ser anunciadas como prontas hoje**.

### GROWTH

Aumentam produtividade/gestão de uma clínica com equipe:

- mais profissionais;
- cadeiras/salas;
- central de retorno;
- pré-cadastro por link;
- comparação de fotos;
- orçamentos;
- financeiro básico;
- relatórios básicos.

### ADVANCED

Fazem mais sentido em operação maior:

- limites ampliados;
- relatórios/financeiro avançados;
- portal do paciente;
- automações avançadas;
- multi-unidade futuramente.

### ADD-ON

Devem ficar fora do aumento obrigatório de plano quando houver custo variável ou implantação específica:

- WhatsApp oficial;
- IA;
- armazenamento adicional além da franquia;
- domínio customizado/configuração externa;
- migração complexa;
- assinatura digital/fiscal, conforme solução escolhida.

### PLATFORM_INTERNAL

Não vender como “benefício Premium”:

- isolamento de tenant;
- Firestore/Storage Rules;
- Platform Owner;
- audit logs essenciais;
- sessão de suporte;
- feature gating seguro;
- integridade clínica;
- LGPD mínima e segurança básica.
