# OdontoFlow V2 — SaaS Dentista Multi-Tenant White-Label

Fundação técnica e de produto para o repositório `CristianoRFB/Dentista`.

## Estado deste pacote

O repositório GitHub estava vazio quando a fundação foi iniciada. Portanto, este ZIP é uma **base inicial executável e documentada**, não uma migração de código legado.

Esta revisão também incorpora uma decisão de produto importante: a landing deve **apresentar o software como produto**, usando benefícios + demonstrações de UI, em vez de uma página institucional genérica.

A arquitetura segue os padrões `GLOBAL-v01` + `APPOINTMENT-v01` + `DENTIST-v01`, alinhados ao Project Core `v01`.

A arquitetura segue:

- React + TypeScript + Vite;
- Firebase Authentication + Firestore;
- isolamento Multi-Tenant por `tenantId` + memberships/permissões;
- Platform Owner global;
- dados clínicos com menor privilégio e suporte auditável;
- Cloudflare Pages para frontend;
- Cloudflare Worker + R2 privado para mídia clínica;
- cache local/IndexedDB para fotos clínicas;
- agenda com profissionais e recursos físicos (cadeira/sala) preparados;
- central de retorno e pré-cadastro público com revisão preparados;
- `tenant.features`, `tenant.limits` e medição de uso preparados para estratégia comercial;
- documentação versionada com `docs/CURRENT.md` como fonte da verdade;
- diagramas editáveis + PNG/SVG;
- testes de domínio e regras iniciais.

## Firebase fornecido

- `projectId`: `dentista-ee9db`
- `authDomain`: `dentista-ee9db.firebaseapp.com`
- `storageBucket`: `dentista-ee9db.firebasestorage.app`

Os valores de configuração web ficam em `.env.example`. Não há chave de service account no pacote.

> Firebase Storage não é usado como repositório principal de fotos clínicas nesta fundação. O módulo `ClinicalPhoto` foi desenhado para R2 privado + cache local. `storage.rules` fica deny-all por padrão.

## Executar

```bash
cp .env.example .env.local
npm install
npm run dev
```

Em modo demonstrativo:

```env
VITE_USE_DEMO_DATA=true
```

Rotas úteis:

- `/` landing comercial;
- `/precos` estrutura comercial sem preços fictícios;
- `/recursos/agenda` e outras páginas de recurso;
- `/demo-clinica` mini-site white-label do tenant;
- `/demo-clinica/agendar` agendamento público demonstrativo;
- `/demo-clinica/app` app do tenant demo;
- `/demo-clinica/cadastro` pré-cadastro público demonstrativo;
- `/platform` Platform Admin.

## Documentação canônica

Leia primeiro:

- `docs/CURRENT.md`
- `docs/versions/v01-multitenant-whitelabel/README.md`
- `docs/versions/v01-multitenant-whitelabel/PRODUCT_STRATEGY.md`
- `docs/versions/v01-multitenant-whitelabel/MARKETING_SITE.md`
- `docs/versions/v01-multitenant-whitelabel/STANDARDS.md`
- `docs/versions/v01-multitenant-whitelabel/CORE_ALIGNMENT.md`
- `docs/versions/v01-multitenant-whitelabel/ACCESSIBILITY.md`
- `IMPLEMENTATION-HANDOFF.md`

## Regra de arquitetura

Um novo consultório/clínica deve entrar por **configuração**, não por clone de repositório.


## Pricing protocol aplicado

A fundação agora contém uma auditoria funcional e uma proposta de pricing da vertical, sem fingir feature gating.

- `docs/versions/v01-multitenant-whitelabel/FEATURE_INVENTORY.md`
- `docs/versions/v01-multitenant-whitelabel/PRICING_AND_PLANS.md`
- `docs/versions/v01-multitenant-whitelabel/ENTITLEMENTS_DELTA.md`
- `docs/versions/v01-multitenant-whitelabel/COMMERCIAL_DEMO.md`

Proposta atual para validação: **R$ 79,90 / R$ 129,90 / R$ 189,90**. Não existe cobrança automática nem entitlement real nesta versão.
