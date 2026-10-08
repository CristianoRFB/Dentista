# Multi-Tenancy

Tenant identificado por slug público → `tenantSlugs/{slug}` → tenantId. Entidades do negócio vivem sob `tenants/{tenantId}`. Memberships usam UID como id dentro do tenant para autorização direta e barata.

## Enforcement ativo

`TenantAccessProvider` verifica a existência/status do slug, carrega o tenant e procura `tenants/{tenantId}/memberships/{uid}`. A membership precisa estar ativa. Uma conta Platform Owner sem membership só entra no contexto clínico por suporte temporário válido.

O frontend deriva paths do tenant resolvido, mas não é a barreira de segurança: as Firestore Rules repetem tenant, estado e permission no servidor. Worker de agenda/mídia revalida o tenant e a membership/permission em cada request. Documento com `tenantId` divergente do caminho é recusado.

O perfil público de marca contém apenas campos explicitamente permitidos. Os testes do Emulator comprovam separação de pacientes, profissionais, appointments, prontuário, fotos e memberships entre tenants A/B; `publicProfile` é intencionalmente público para mini-sites e só pode ser alterado pelo Platform Owner com auditoria.

O modo demo de `demo-clinica` só funciona no servidor dev com `VITE_USE_DEMO_DATA=true`; ele não cria tenant real nem autoriza writes.
