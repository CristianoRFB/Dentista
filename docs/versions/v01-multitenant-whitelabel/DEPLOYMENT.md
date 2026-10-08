# Deploy

Frontend: Cloudflare Pages. Auth/DB: Firebase. Mídia clínica: Cloudflare Worker + R2 privado. Um deploy por vertical, vários tenants.

## Estado deste workspace

O frontend de produção é gerado por `npm run build`, mas não existe deploy de produção configurado ou executado por este GOAL. Para implantação, deve-se configurar um único projeto Firebase da vertical, Cloudflare Pages, Worker e bucket R2 privado.

O Worker exige `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_EMAIL` e `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY` como secrets/vars no ambiente do Worker. Configure `CLINICAL_MEDIA` como binding R2 e `APP_ORIGIN` com a origem exata do frontend. A conta de serviço deve ter somente acesso Firestore necessário. Não configure chave privada em Vite, `wrangler.toml` ou arquivo versionado.

Em desenvolvimento, Firestore Emulator usa porta `8081` e Auth Emulator `9098` quando `VITE_USE_FIREBASE_EMULATORS=true`. O modo demo fictício é separado (`VITE_USE_DEMO_DATA=true`) e restrito a `import.meta.env.DEV`.

`storage.rules` permanece deny-all. Não se deve criar Firebase ou deploy por tenant. Os segredos e as credenciais do projeto real precisam ser provisionados fora deste repositório antes de liberar um ambiente de produção.
