# Onboarding

Platform Owner autenticado cria tenant, slug único, membership inicial `tenant_owner` e `publicProfile` básico em operação auditada. O tenant fica ativo; o owner cadastra profissionais, pacientes, procedimentos e recursos sob o tenant.

Para associar o owner, use um UID existente do Firebase Auth e valide-o fora do formulário antes de provisionar. A membership não cria conta nem concede acesso sem autenticação válida. Suspensão/reativação preserva dados e atualiza tenant e slug; não remove registros.

Branding básico é configurável e alimenta o perfil público. `features`/`limits` permanecem scaffolds: este onboarding não ativa plano, entitlement ou cobrança. O Platform Owner só acessa dados clínicos com suporte temporário justificado e auditado.
