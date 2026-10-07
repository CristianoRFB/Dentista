# Alinhamento com SaaS Project Core v01

Revisão feita contra `SAAS_PROJECT_CORE(2).md` v01.

Objetivo desta revisão: aplicar **somente** mudanças GLOBAL/VERTICAL ausentes, sem reescrever o que já estava correto e sem puxar regras locais de outros SaaS.

## GLOBAL — já existia e foi preservado

| Padrão | Estado |
|---|---|
| Multi-Tenant por vertical | ✅ já existia |
| White-Label por tenant | ✅ já existia |
| `platform_owner` global | ✅ já existia |
| `tenant_owner` + papéis específicos | ✅ já existia |
| memberships / RBAC | ✅ já existia |
| tenant resolver por slug | ✅ já modelado |
| isolamento de dados | ✅ já modelado |
| Firestore Rules / Storage Rules | ✅ já existiam |
| audit logs | ✅ já modelados, persistência real ainda no backlog |
| feature flags + limites | ✅ já existiam |
| tenant desativado sem exclusão automática | ✅ já modelado |
| documentação versionada + `docs/CURRENT.md` | ✅ já existia |
| diagramas versionados | ✅ já existiam |
| segundo tenant de teste | ✅ já existe em demo/seed |
| testes Tenant A × Tenant B | ✅ base inicial existente |
| onboarding sem clone de código | ✅ já documentado |
| deploy compartilhado na vertical | ✅ já documentado |
| padrão de landing SaaS / pricing | ✅ já aplicado |
| responsividade | ✅ já existia no CSS |

## GLOBAL — faltava e foi aplicado nesta revisão

### 1. Rastreio explícito do Core
Foi criado `STANDARDS.md` com:

- `CORE_VERSION=v01`;
- `GLOBAL_STANDARD=GLOBAL-v01`;
- `VERTICAL_STANDARD=APPOINTMENT-v01`;
- `PRODUCT_STANDARD=DENTIST-v01`.

Também foi adicionada validação automatizável por `npm run check:standards`.

### 2. Roadmap dentro da documentação canônica
O Core recomenda `ROADMAP.md` dentro da versão vigente. Antes havia somente o roadmap na raiz. Agora a versão canônica também possui seu próprio `ROADMAP.md`.

### 3. Baseline explícita de acessibilidade
A interface já possuía responsividade e foco visível, mas o padrão não estava completo/documentado. Foram adicionados:

- skip link global;
- classe `sr-only`;
- redução de movimento via `prefers-reduced-motion`;
- `caption` acessível na tabela de tenants;
- `aria-live` no progresso de agendamento;
- `aria-pressed` na seleção de horário;
- rótulo de navegação no painel do tenant.

Isso é baseline, não certificação de conformidade. Auditoria assistiva/automatizada continua pendente antes de produção.

## GLOBAL — continua pendente por depender de implementação real

### Screenshots reais
O Core exige screenshots reais como evidência de implementação. O produto ainda é uma fundação/scaffold e o build completo com dependências não foi concluído neste ambiente. Nenhum mockup foi promovido falsamente a screenshot real.

O diretório `screenshots/` continua como gate de aceite para quando o app estiver executado/validado em ambiente real.

## VERTICAL — Agendamento

| Regra vertical | Estado |
|---|---|
| Agenda | ✅ já existe como scaffold |
| Disponibilidade | ✅ domínio inicial existente |
| Bloqueios | ✅ considerados na regra de conflito |
| Prevenção de conflito | ✅ profissional + recurso físico |
| Retornos | ✅ entidade/central própria |
| Lembretes automáticos | ⏳ DEFERRED |

### Por que lembretes não foram implementados agora
O Core determina que registrar uma ideia não significa implementá-la imediatamente. Lembretes dependem de canal/provedor, custos, consentimento e operação real. Portanto foram adicionados ao roadmap como `DEFERRED`, sem aumentar o escopo atual de autenticação, isolamento e persistência.

## LOCAL — não alterado

Foram preservadas sem mudança estrutural as decisões exclusivas do Dentista:

- prontuário append-only + adendos;
- odontograma orientado a eventos;
- planos de tratamento;
- ClinicalPhoto;
- R2 privado + cache local;
- sessão de suporte clínico auditável.

Nenhuma dessas regras foi generalizada para outros SaaS nesta revisão.
