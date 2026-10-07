# AGENTS.md

Antes de alterar arquitetura, banco, autenticação, tenants, white-label, rotas, dados clínicos, mídia clínica ou deploy:

1. leia `docs/CURRENT.md`;
2. leia a versão apontada por ele;
3. consulte `DECISIONS.md` e `IMPLEMENTATION-HANDOFF.md`;
4. não use documentação histórica como fonte da verdade;
5. preserve isolamento Multi-Tenant;
6. nunca trate frontend como camada de segurança;
7. não apague registros clínicos relevantes silenciosamente;
8. não exponha arquivos clínicos em URLs públicas permanentes;
9. não adicione serviço pago sem decisão explícita;
10. não crie deploy/Firebase separado por tenant sem necessidade comprovada.


## Sincronização com o Project Core

11. leia `docs/versions/v01-multitenant-whitelabel/STANDARDS.md`;
12. se `SAAS_PROJECT_CORE(2).md` ou uma versão mais nova do Core for fornecida no contexto do Project, compare primeiro e aplique somente o delta GLOBAL/VERTICAL relevante;
13. preserve decisões já corretas e regras LOCAL do Dentista;
14. não implemente automaticamente uma ideia apenas porque ela aparece no Core: respeite prioridade `NOW/NEXT/DEFERRED`;
15. não trate mockup como screenshot real de implementação.
