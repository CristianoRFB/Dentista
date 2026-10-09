# Deploy

Frontend: Cloudflare Pages. Auth/DB: Firebase. Mídia clínica: Cloudflare Worker + R2 privado. Um deploy por vertical, vários tenants.

## Estado deste workspace — 2026-10-09

O pedido de deploy deste GOAL foi autorizado pelo usuário, mas não foi executado. A sessão web do Firebase Console está autenticada no projeto `dentista-ee9db`; porém, a página do Cloud Firestore oferece `Criar banco de dados`, indicando que ainda não há banco provisionado. Ao avançar no formulário, o próprio Console mostra `Não é possível ativar o Firestore para este projeto — Ocorreu um erro desconhecido`. O Firebase CLI continua sem contas autorizadas. O Wrangler e o painel Cloudflare também estão sem autenticação, não há tokens no ambiente, `.env.local`, `workers/media-api/.dev.vars` nem configuração local de projeto Pages, e `APP_ORIGIN` no Worker ainda é `http://localhost:5173`. O repositório GitHub público está acessível, mas não há workflows, execuções do Actions, deployments, hooks, secrets, variables ou ambientes de produção configurados. Não é possível verificar secrets ou bindings já provisionados na conta Cloudflare. A configuração disponível aponta para uma origem local, então não é segura para publicação de produção. Nenhuma alteração de produção foi iniciada.

O frontend de produção é gerado por `npm run build`. Antes do deploy, use um único projeto Firebase da vertical, um projeto Cloudflare Pages, o Worker e o bucket R2 privados já configurados. Não crie serviço pago ou ambiente por tenant para suprir credenciais ausentes.

O Worker exige `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_EMAIL` e `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY` como secrets/vars no ambiente do Worker. Configure `CLINICAL_MEDIA` como binding R2 e `APP_ORIGIN` com a origem exata do frontend. A conta de serviço deve ter somente acesso Firestore necessário. Não configure chave privada em Vite, `wrangler.toml` ou arquivo versionado.

Em desenvolvimento, Firestore Emulator usa porta `8081` e Auth Emulator `9098` quando `VITE_USE_FIREBASE_EMULATORS=true`. O modo demo fictício é separado (`VITE_USE_DEMO_DATA=true`) e restrito a `import.meta.env.DEV`.

`storage.rules` permanece deny-all. Não se deve criar Firebase ou deploy por tenant. Os segredos e as credenciais do projeto real precisam ser provisionados fora deste repositório antes de liberar um ambiente de produção.
