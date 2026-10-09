# COMMERCIAL DEMO — regra da demonstração e da landing

## Demo tenant

A demonstração deve usar um tenant configurável, não fork de código.

```text
slug: demo-clinica
planId: premium_demo
subscriptionStatus: demo
branding: fictício
patients: fictícios
professionals: fictícios
```

`premium_demo` não é um quarto plano pago. A demo exibe banner permanente, usa apenas dados fictícios e é somente leitura. Worker e Rules recusam mutações.

A demo mostra o potencial máximo **somente no que for demonstrável**.

Capacidades ainda planejadas podem aparecer em telas conceituais apenas com rótulo claro:

```text
Planejado
Em implementação
Demonstração conceitual
```

Nunca usar paciente real.

## Landing do SaaS

Estrutura mantida:

```text
Hero
-> problemas/benefícios
-> produto visível
-> recursos
-> fotos clínicas
-> fluxo de tratamento
-> planos
-> comparação
-> FAQ
-> CTA
```

A landing comercial vende o OdontoFlow.
O mini-site `/{tenantSlug}` vende/apresenta a clínica do cliente.

## Pricing

A rota `/precos` mostra planos, valores e limites aprovados, sem checkout ou processamento de cobrança.

Deve exibir:

- preços mensais e anuais aprovados;
- desconto anual de 10%;
- plano recomendado;
- diferenças decisivas;
- limites;
- aviso de disponibilidade real;
- CTA para demo/interesse.

Não deve exibir “assinar agora”. Billing automático e checkout permanecem DEFERRED.

## Demo personalizada por lead

Futuro fluxo:

```text
LEAD_CONTEXT.md
-> criar/configurar demo tenant
-> branding do lead
-> sample data fictício contextualizado
-> premium_demo
-> URL exclusiva por slug
```

Sem código exclusivo do lead.
