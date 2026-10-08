# Estrutura real do projeto

```text
src/
  domain/                 tipos, roles e permissões locais da vertical
  lib/                    Firebase, acesso tenant-scoped, agenda, memberships e Platform Owner
  modules/
    auth/                 AuthProvider, login e route guards
    tenant/               tenant resolver/context, dashboard e shell
    platform/             operações de Platform Owner
    patients/             CRUD e listagem de pacientes
    scheduling/           agenda, recursos e disponibilidade de domínio
    clinical/             prontuário e adendos append-only
    clinical-media/       cliente do Worker e cache local
    public/                landing, páginas públicas e white-label
    recalls/              central somente leitura neste estágio
  sample/                  fixtures fictícias usadas somente no modo demo explícito
tests/
  firestoreRules.test.ts  Firebase Emulator + @firebase/rules-unit-testing
  schedulingWorker.test.ts algoritmo de conflitos e locks
  *.test.ts                testes unitários da vertical
workers/media-api/
  src/index.ts             API de agenda e mídia privada
  src/scheduling.ts        domínio de intervalo/conflito/locks
docs/
  CURRENT.md               seleção da fonte canônica
  versions/v01-multitenant-whitelabel/
    diagrams/source/       Mermaid e DOT editáveis
    diagrams/rendered/     SVG vigente; PNG legado
    screenshots/           capturas reais do runtime, separadas de conceitos
    generated/              conceitos gerados, nunca prova de implementação
```

Infraestrutura de deploy continua proposta: um frontend por vertical, Firebase compartilhado pela vertical e Worker/R2 privados. Não há Firebase/deploy separado por tenant. Leads não são pastas de projeto nesta versão porque não existe lead confirmado.
