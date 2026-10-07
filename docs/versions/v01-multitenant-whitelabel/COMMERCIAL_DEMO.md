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

A rota `/precos` nesta fundação é uma **página de proposta**, não checkout.

Deve exibir:

- `PROPOSTA EM VALIDAÇÃO`;
- preço mensal sugerido;
- desconto anual proposto;
- plano recomendado;
- diferenças decisivas;
- limites;
- aviso de disponibilidade real;
- CTA para demo/interesse.

Não deve exibir “assinar agora” até entitlement e onboarding real existirem.

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
