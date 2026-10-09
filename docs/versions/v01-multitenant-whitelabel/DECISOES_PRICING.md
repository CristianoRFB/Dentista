# DECISOES_PRICING — FECHADAS

> Status: **APROVADO PELO PRODUTO em 2026-10-06**.  
> Estas decisões estão travadas para a vertical Dentista até revisão explícita.  
> A aprovação comercial não ativa billing. Runtime de entitlements e quotas está implementado; cobrança automática continua DEFERRED.

## A. PREÇOS — APROVADO

- **Essencial:** R$ 79,90/mês.
- **Pro:** R$ 129,90/mês.
- **Premium:** R$ 189,90/mês.
- **Anual:** 10% de desconto.
  - Essencial: R$ 862,92/ano.
  - Pro: R$ 1.402,92/ano.
  - Premium: R$ 2.050,92/ano.
- **Implantação padrão na fase de validação:** R$ 0.
- **Migração complexa:** Add-on sob orçamento.
- **Trial:** até 14 dias sem cartão, ativado manualmente pelo Platform Owner com `trialUntil` explícito; sem conversão automática.
- **Add-ons externos:** sem preço até provedor/custo real estarem definidos.
- **Storage excedente:** sem preço público até existir medição confiável de uso/custo.

## B. PLANOS — APROVADO

- nomes: **Essencial / Pro / Premium**;
- plano destacado: **Pro — Recomendado**;
- Essencial: dentista solo / consultório enxuto;
- Pro: clínica pequena/média com equipe;
- Premium: clínica maior / maior capacidade operacional;
- Premium não deve depender de promessas de features ainda não implementadas.

## C. FEATURES — APROVADO

### Essencial

Core clínico e operacional:

- white-label básico;
- pacientes;
- profissionais;
- procedimentos;
- agenda;
- agendamento público;
- prontuário;
- adendos;
- odontograma;
- plano de tratamento básico;
- fotos clínicas;
- mini-site da clínica;
- documentos básicos.

A disponibilidade real continua determinada pelo estado da `FEATURE_MATRIX.md`.

### Pro

Começam no Pro, quando estiverem realmente disponíveis:

- múltiplos recursos físicos/cadeiras;
- Central de Retorno;
- pré-cadastro por link;
- timeline/comparação avançada de fotos;
- orçamentos;
- financeiro básico;
- relatórios básicos.

### Premium

- maior capacidade operacional;
- relatórios avançados somente quando implementados;
- financeiro avançado somente quando implementado.

Não vender como pronto: portal do paciente, estoque, comissão, automações avançadas ou multi-unidade.

### Add-ons

- lembretes/WhatsApp;
- assinatura digital;
- IA;
- fiscal/NFS-e;
- storage adicional;
- domínio personalizado;
- migração complexa.

### NÃO diferenciar por plano

- segurança;
- isolamento entre tenants;
- RBAC/autorização necessária;
- integridade e histórico clínico;
- auditabilidade necessária;
- anti-double-booking;
- validação backend;
- proteção dos arquivos.

## D. LIMITES — APROVADO

| Limite | Essencial | Pro | Premium | Regra |
|---|---:|---:|---:|---|
| Profissionais clínicos | 1 | 3 | 10 | driver natural de upgrade |
| Usuários administrativos adicionais | 2 | 6 | 20 | `tenant_owner` não consome esta franquia |
| Cadeiras/salas/equipamentos | 1 | 5 | 15 | quando aplicável |
| Storage clínico | 10 GB | 50 GB | 200 GB | **hipótese interna aprovada; não publicar como promessa até validar R2** |
| Unidades | 1 | 1 | 1 | multi-unidade continua deferred |
| Pacientes | sem limite artificial | sem limite artificial | sem limite artificial | — |
| Agendamentos | sem limite artificial | sem limite artificial | sem limite artificial | — |
| Histórico clínico | completo | completo | completo | nunca cortar por plano |

## E. DEMO — APROVADO

- `planId = premium_demo`;
- `subscriptionStatus = demo`;
- dados 100% fictícios;
- identificação visual permanente de ambiente de demonstração;
- liberar somente funcionalidades efetivamente demonstráveis no build;
- planejadas/deferred nunca aparecem como disponíveis;
- demo não é assinatura paga e não gera cobrança.

**CANDIDATO_A_PADRAO_GLOBAL:** DemoMode / `subscriptionStatus = demo`.

## F. LANDING / PRICING — APROVADO

Mostrar somente diferenças comercialmente compreensíveis:

- quantidade de profissionais;
- usuários administrativos;
- cadeiras/salas;
- storage apenas depois da validação pública da franquia;
- Central de Retorno;
- pré-cadastro;
- comparação de fotos;
- orçamento;
- financeiro;
- relatórios.

Destacar **Pro — Recomendado**.

Não colocar na comparação comercial:

- Firebase/R2;
- tenant resolver;
- RBAC interno;
- Firestore/Storage Rules;
- IndexedDB;
- nomes de coleções;
- EntitlementService/limits engine;
- detalhes técnicos de segurança;
- features deferred como se estivessem disponíveis.

## G. DECISÕES TÉCNICAS — TRAVADAS NA VERTICAL

- downgrade nunca apaga prontuário, pacientes, fotos ou histórico;
- se o tenant estiver acima do novo limite, preservar dados e bloquear apenas nova capacidade quando necessário;
- limites de profissionais, memberships adicionais e recursos físicos são validados transacionalmente pelo Worker;
- atribuição manual de plano/status/trial/overrides pelo Platform Owner exige motivo e snapshot antes/depois em auditoria sem PHI;
- acesso clínico necessário à continuidade não é bloqueado por plano ou estado comercial; demo é somente leitura;
- cota de mídia deve usar consumo real do R2 antes de virar cobrança pública;
- segurança clínica nunca depende do plano;
- não criar fork de código por plano ou tenant.

## GLOBAL STANDARD v01 — IMPLEMENTADO NESTA VERTICAL

Esta vertical implementa o contrato de Plans & Entitlements v01 com adaptação aos limites e funcionalidades aprovados para Dentista:

- `src/commercial/planCatalog.ts` é a fonte de preços, plano e limites;
- `src/commercial/entitlementService.ts` resolve feature e quota efetivas;
- feature gates protegem navegação/rotas, Firestore Rules e operações do Worker;
- quotas de capacidade contam profissionais, memberships ativos exceto `tenant_owner`, e recursos;
- `tenant.entitlementOverrides` e `tenant.limitOverrides` são mudanças manuais auditadas;
- trial exige data final explícita de até 14 dias, sem conversão automática;
- upgrade/downgrade preservam dados e bloqueiam apenas novas capacidades acima da quota;
- `premium_demo` permanece alias read-only com conteúdo fictício.

O padrão continua sujeito a sincronização explícita quando o Project Core fornecer versão posterior. Esta implementação não adiciona checkout, gateway, cobrança automática ou serviço pago.

## DECISÕES DE BAIXO RISCO TAMBÉM APROVADAS

- pacientes sem limite artificial;
- agendamentos sem limite artificial;
- histórico clínico completo em qualquer plano;
- segurança e isolamento não são paywall;
- feature não implementada nunca aparece como disponível;
- frontend nunca é o único enforcement;
- demo usa apenas dados fictícios.

## DEFERRED — MANTER ASSIM

- checkout/gateway/webhooks;
- billing automático;
- cobrança por uso;
- preço de WhatsApp oficial;
- preço/fornecedor de IA;
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

## Pendências de decisão

**Nenhuma pendência comercial/técnica desta etapa.**  
Qualquer mudança futura reabre explicitamente a decisão correspondente.
