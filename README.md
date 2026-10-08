# OdontoFlow V2 — SaaS Dentista Multi-Tenant White-Label

Fundação técnica e de produto para o repositório `CristianoRFB/Dentista`.

## Estado deste pacote

O repositório GitHub estava vazio quando a fundação foi iniciada. Portanto, este ZIP é uma **base inicial executável e documentada**, não uma migração de código legado.

Esta revisão também incorpora uma decisão de produto importante: a landing deve **apresentar o software como produto**, usando benefícios + demonstrações de UI, em vez de uma página institucional genérica.

## Core operacional — 2026-10-07

O Core Multi-Tenant e Clínico P0 agora inclui login/logout, guards, tenant resolver, memberships/RBAC, Platform Owner, CRUD tenant-scoped de pacientes/profissionais/procedimentos/recursos, agenda transacional pelo Worker, prontuário append-only/adendos, fotos privadas em R2 e audit logs essenciais.

O modo demo é fictício, somente leitura e restrito a `npm run dev` com `VITE_USE_DEMO_DATA=true`. Não representa cliente real. Booking/intake públicos reais, retorno persistido, odontograma, planos de tratamento, billing e entitlement runtime continuam fora deste estágio.

A arquitetura segue os padrões `GLOBAL-v01` + `APPOINTMENT-v01` + `DENTIST-v01`, alinhados ao Project Core `v01`.

A arquitetura segue:

- React + TypeScript + Vite;
- Firebase Authentication + Firestore;
- isolamento Multi-Tenant por `tenantId` + memberships/permissões;
- Platform Owner global;
- dados clínicos com menor privilégio e suporte auditável;
- Cloudflare Pages para frontend;
- Cloudflare Worker para agenda e R2 privado para mídia clínica;
- cache local/IndexedDB para fotos clínicas;
- agenda com profissionais e recursos físicos validada fora do frontend;
- Central de Retorno e pré-cadastro público ainda não persistidos;
- `tenant.features`, `tenant.limits` e medição de uso preparados para estratégia comercial;
- documentação versionada com `docs/CURRENT.md` como fonte da verdade;
- diagramas editáveis + PNG/SVG;
- testes de domínio, autorização Worker e Firestore Rules via Emulator.

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

O modo demo só atua no servidor de desenvolvimento, usa fixtures fictícias e não habilita gravações. Para verificar Security Rules: `npm run test:rules` (Auth Emulator 9098 / Firestore Emulator 8081; projeto demo sem acesso à produção).

Rotas úteis:

- `/` landing comercial;
- `/precos` estrutura comercial sem preços fictícios;
- `/recursos/agenda` e outras páginas de recurso;
- `/demo-clinica` mini-site white-label do tenant;
- `/demo-clinica/agendar` agendamento público demonstrativo;
- `/demo-clinica/app` app do tenant demo;
- `/demo-clinica/cadastro` pré-cadastro público demonstrativo;
- `/platform` Platform Admin.

Comandos de verificação: `npm run typecheck`, `npm test`, `npm run worker:typecheck`, `npm run build`, `npm run check:standards`, `npm run test:rules`, `npm run docs:diagrams`, `npm run docs:leads` e `npm run docs:check`.

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

Preços preservados: **Essencial R$ 79,90 / Pro R$ 129,90 / Premium R$ 189,90 por mês**. Não existe cobrança automática nem entitlement runtime nesta versão.
