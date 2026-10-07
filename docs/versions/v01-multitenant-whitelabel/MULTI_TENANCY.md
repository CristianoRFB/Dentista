# Multi-Tenancy

Tenant identificado por slug público → `tenantSlugs/{slug}` → tenantId. Entidades do negócio vivem sob `tenants/{tenantId}`. Memberships usam UID como id dentro do tenant para autorização direta e barata.
