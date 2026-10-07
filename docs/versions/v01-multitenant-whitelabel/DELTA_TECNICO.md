# DELTA_TECNICO — Pricing & Entitlements

> Somente o que ainda falta para planos reais.  
> Decisões comerciais da vertical: **APROVADAS**; implementação técnica continua pendente.  
> Estado considerado: após a refatoração executiva deste pacote.

| Área | Falta | Prioridade |
|---|---|---|
| Catálogo de planos | transformar a proposta estática em fonte canônica de runtime/versionada e permitir atribuição manual pelo Platform Owner | NEXT |
| Entitlements | implementar `getEffectiveEntitlements`, `canUse` e `getLimit`, combinando plano + overrides + status | NEXT |
| Feature gating | gates consistentes em navegação, rotas, componentes e ações; sem usar esconder botão como segurança | NEXT |
| Limits | enforcement confiável/atômico para profissionais, admins, recursos físicos e storage | NEXT |
| Backend validation | validar feature/limite/status em Worker/API/Function antes de mutações ou consumo de recurso | NEXT |
| Demo mode | definir comportamento de `premium_demo/demo` dentro do entitlement engine sem tratá-lo como assinatura paga | NEXT |
| Landing/pricing | ligar disponibilidade e limites ao catálogo canônico quando ele existir; manter sem checkout por enquanto | NEXT |
| Subscription status | implementar transições e efeitos de `trial/active/past_due/suspended/cancelled/demo` | NEXT |
| Trial | expiração real, datas, bloqueios e conversão manual/automática | NEXT |
| Upgrade/downgrade | preservar dados clínicos; bloquear somente nova capacidade quando acima do limite; nunca apagar prontuário/fotos/histórico | NEXT |
| Overrides | exceções por tenant como dados, nunca `if tenantId === ...` | NEXT |
| Usage | medir bytes R2 e demais consumos variáveis antes de cobrar excedentes | NEXT |
| Testes | fixtures Essencial/Pro/Premium/Demo; gating UI/backend; limites; overrides; status; upgrade/downgrade; Tenant A x B | NEXT |
| Documentação operacional | runbook técnico de entitlement/status/downgrade quando o runtime for implementado | NEXT |
| R2 / fotos clínicas | validar permissão granular, tenant ativo, entitlement `clinical_photos`, cota, usage e auditoria no backend | NEXT |
| Agenda / equipe | enforcement de quantidade de profissionais e recursos físicos sem corrida de escrita | NEXT |
| Cobrança | checkout, gateway, webhook e reconciliação financeira | DEFERRED |
| Add-ons externos | WhatsApp, IA, assinatura digital e fiscal após provedor/custo/privacidade/contrato definidos | DEFERRED |
| Multi-unidade | entitlement e modelo comercial somente quando houver demanda real | DEFERRED |

## O que já existe e não deve ser refeito

- proposta comercial estática e página `/precos`;
- `planId`, `subscriptionStatus` e `premium_demo` como modelagem/scaffold;
- `tenant.features`, `tenant.limits` e usage modelado;
- landing/demo com aviso de proposta;
- isolamento, RBAC e segurança como responsabilidade interna, não feature Premium.
