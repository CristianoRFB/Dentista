# PRICING_AND_PLANS_APPROVED — SaaS Dentista

> Status: **APROVADO em 2026-10-06**.  
> Valores e posicionamento comercial estão travados para a consolidação global.  
> Aprovação comercial não equivale a cobrança ativa nem a entitlement implementado.

## Planos aprovados

| Plano | Mensal | Anual (10% off) | Público | Diferença decisiva |
|---|---:|---:|---|---|
| **Essencial** | **R$ 79,90/mês** | **R$ 862,92/ano** | dentista solo / consultório enxuto | core clínico com menor capacidade operacional |
| **Pro** | **R$ 129,90/mês** | **R$ 1.402,92/ano** | clínica pequena/média com equipe | mais capacidade + recursos de crescimento |
| **Premium** | **R$ 189,90/mês** | **R$ 2.050,92/ano** | clínica maior / maior capacidade operacional | escala; features avançadas só entram quando realmente existirem |

## Plano recomendado

**Pro — Recomendado.**

## Limites comerciais aprovados

| Limite | Essencial | Pro | Premium |
|---|---:|---:|---:|
| Profissionais clínicos | 1 | 3 | 10 |
| Usuários administrativos adicionais | 2 | 6 | 20 |
| Cadeiras/salas/equipamentos | 1 | 5 | 15 |
| Storage clínico* | 10 GB | 50 GB | 200 GB |
| Unidades | 1 | 1 | 1 |

`tenant_owner` não consome a franquia de usuários administrativos adicionais.

`*` 10/50/200 GB é **hipótese interna aprovada**, mas não deve ser publicada como promessa comercial até a medição/custo real de R2 ser validada.

Pacientes, agendamentos e histórico clínico não recebem limite artificial.

## Implantação, trial e add-ons

- implantação padrão durante validação: **R$ 0**;
- migração complexa: **Add-on sob orçamento**;
- trial futuro: **14 dias sem cartão**, somente depois do lifecycle de assinatura existir;
- antes do trial real: usar demo;
- WhatsApp, IA, assinatura digital, fiscal e storage excedente: **sem preço até custo/provedor estarem definidos**.

## Demo aprovada

- `planId = premium_demo`;
- `subscriptionStatus = demo`;
- dados fictícios;
- ambiente identificado visualmente como demonstração;
- libera apenas recursos realmente demonstráveis no build;
- não gera cobrança.

## Landing / pricing

- destacar Pro como **Recomendado**;
- comparar profissionais, admins, recursos físicos e features comerciais relevantes;
- storage só entra na promessa pública após validação de custo/uso;
- feature não pronta nunca aparece como disponível;
- sem `Assinar agora` enquanto não houver onboarding/entitlements de produção;
- CTA permitido antes disso: demo, lista de interesse, contato.

## Justificativa curta

- **Essencial** reduz barreira de entrada para consultório pequeno;
- **Pro** concentra o melhor equilíbrio de capacidade, ticket e valor percebido;
- **Premium** monetiza escala sem depender de features futuras inventadas.
