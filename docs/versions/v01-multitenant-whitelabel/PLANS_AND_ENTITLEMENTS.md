# Plans & Entitlements v01 — contrato operacional da vertical Dentista

Estado em 2026-10-09. Este documento descreve o runtime atual; a matriz completa de capacidades continua em `FEATURE_MATRIX.md`.

## Fontes canônicas

- `src/commercial/planCatalog.ts`: preços, planos, features comerciais e limites aprovados.
- `src/commercial/entitlementService.ts`: resolução das features e dos limites efetivos.
- `src/lib/platformData.ts` e `src/modules/platform/PlatformDashboard.tsx`: atribuição manual de plano/status/trial/overrides.
- `workers/media-api/src/index.ts`: enforcement confiável das capacidades cotadas.
- `firestore.rules`: acesso por tenant, negação de bypass de quotas e proteção de demo.
- `FEATURE_MATRIX.md`: inventário do que está implementado, em implementação, planejado ou deferred.

## Planos e preços aprovados

| Plano | Mensal | Total anual | Profissionais | Memberships ativos adicionais | Recursos físicos |
|---|---:|---:|---:|---:|---:|
| Essencial | R$ 79,90 | R$ 862,92 | 1 | 2 | 1 |
| Pro | R$ 129,90 | R$ 1.402,92 | 3 | 6 | 5 |
| Premium | R$ 189,90 | R$ 2.050,92 | 10 | 20 | 15 |

`tenant_owner` não consome o limite de memberships adicionais. O primeiro recurso físico é permitido no Essencial; múltiplos recursos começam no Pro. Pacientes, agendamentos e histórico clínico não têm limite artificial. Cada tenant tem uma unidade.

Este GOAL não presume tenants legados nem migra tenants sem estado comercial explícito. A ausência ou inconsistência de `planId`/`subscriptionStatus` não é inferida como plano Essencial: features comerciais, mini-site público e nova capacidade falham fechados. O acesso de preservação ao prontuário e às fotos clínicas não depende de assinatura. Qualquer tenant real deve ser identificado por inventário validado e receber atribuição manual do Platform Owner; não há migração automática.

Os limites de 10/50/200 GB de armazenamento são hipótese interna aprovada. Não são publicados nem aplicados: `getLimit('storageBytes')` é `null` até existir medição confiável de bytes e custo R2.

## Features efetivamente disponíveis

O runtime só libera features que constam em `IMPLEMENTED_FEATURES`. Features comerciais exigem plano/status válidos; prontuário e leitura de fotos clínicas permanecem acessíveis sob permissão clínica, mesmo sem plano válido ou após downgrade. A Central de Retorno aparece na proposta Pro, mas permanece indisponível no runtime enquanto sua operação de escrita não estiver implementada. Pré-cadastro persistente, odontograma, plano de tratamento, financeiro, relatórios e demais capacidades futuras também não são liberados por override.

Flags operacionais `tenant.features`: ausência mantém o default do catálogo; `false` desliga a feature; valor malformado não a habilita. `entitlementOverrides` pode restringir ou conceder uma feature comercial conhecida e implementada; não torna uma feature planejada operacional nem bloqueia prontuário/leitura de fotos por downgrade. O flag operacional segue sendo um controle explícito. Segurança, RBAC, isolamento e integridade clínica não são diferenciais de plano.

## Estado comercial e trial

- `active`: plano pago válido.
- `trial`: plano pago válido e `trialUntil` explícito, futuro e dentro de 14 dias.
- `past_due`, `suspended` e `cancelled`: não liberam recursos comerciais nem nova capacidade.
- `premium_demo` + `demo`: alias de demonstração fictícia, read-only, sem assinatura ou cobrança.

O Platform Owner atribui o estado manualmente. Cada alteração exige motivo e auditoria com snapshots de `planId`, `subscriptionStatus`, `trialUntil`, `entitlementOverrides` e `limitOverrides` antes/depois. Esses snapshots não incluem dados clínicos. Checkout, gateway, conversão de trial e cobrança automática não existem neste escopo.

Dados e histórico clínicos existentes nunca são apagados ou escondidos por downgrade. A continuidade de acesso clínico não depende do plano ou do status comercial; demo não exibe registros clínicos fictícios nem permite escrita. A suspensão operacional do tenant continua sendo uma barreira separada.

## Enforcement de quotas

Profissionais, memberships adicionais e recursos físicos são alterados pelo endpoint autenticado do Worker. O Worker valida tenant, membership/permissão, estado comercial e limite dentro da transação que grava o registro, atualiza contador e cria auditoria. As Firestore Rules negam escrita direta do browser nessas coleções e em `limitCounters`.

Contagens consideram profissionais ativos, memberships com status `active` exceto `tenant_owner`, e recursos com `active == true`. Criação/ativação ou mudança que aumente capacidade é recusada quando ultrapassar o limite. Desativação continua permitida acima do limite e não apaga registros; updates que não aumentam capacidade continuam disponíveis. Sem contador inicializado, o Worker recompõe a contagem a partir dos registros ativos antes de permitir um aumento. Contador inválido falha fechado para novas capacidades.

Agendamentos e mídia mantêm os próprios controles de autorização clínica/tenant; não recebem quota artificial desta implementação. A página e o frontend nunca são a única camada de enforcement.

## Proteção da demonstração

A demonstração exige o alias `premium_demo` e estado `demo`. Configuração inconsistente com qualquer um desses sinais é tratada de forma restritiva nas regras de escrita. O banner identifica permanentemente o ambiente; o conjunto de dados é fictício; formulários e endpoints não persistem operações; endpoints do Worker recusam mutações de demo.

## Verificações de manutenção

Após mudanças comerciais, executar a suíte unitária, os testes do Firestore Emulator, typecheck do frontend e do Worker, build e verificações de documentação. Atualizar este contrato e `FEATURE_MATRIX.md` no mesmo change set. Não alterar os valores comerciais nem o enforcement de quotas sem decisão explícita do produto.
