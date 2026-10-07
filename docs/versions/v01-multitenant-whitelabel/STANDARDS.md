# Standards adotados

Este arquivo registra quais padrões do ecossistema SaaS este produto já incorporou.

```txt
CORE_SOURCE=SAAS_PROJECT_CORE(2).md
CORE_VERSION=v01
GLOBAL_STANDARD=GLOBAL-v01
VERTICAL_STANDARD=APPOINTMENT-v01
PRODUCT_STANDARD=DENTIST-v01
PRICING_PROTOCOL_SOURCE=SAAS_PRICING_PLANS_REFACTOR_PROTOCOL(1).md
```

## Interpretação

- `GLOBAL-v01`: identificação local da versão global correspondente ao Core `v01`.
- `APPOINTMENT-v01`: baseline vertical registrada localmente para produtos com agenda, derivada das regras de agendamento descritas no Core `v01`.
- `DENTIST-v01`: decisões específicas desta vertical odontológica.

Esses identificadores não fundem os produtos do ecossistema e não criam dependência de runtime entre repositórios. Servem para descobrir quais SaaS já foram revisados contra o Core vigente.

## Regra de sincronização

Quando uma versão nova do Project Core for fornecida:

1. comparar o Core novo com este arquivo e com `CORE_ALIGNMENT.md`;
2. preservar tudo que já esteja correto;
3. aplicar apenas o delta GLOBAL/VERTICAL que realmente afeta Dentista;
4. não promover regra LOCAL de outro SaaS para este produto;
5. não aumentar um goal crítico em andamento com feature de baixa prioridade;
6. registrar mudanças em `DECISIONS.md`, `STATUS.md` e `ROADMAP.md`;
7. atualizar estes identificadores apenas quando a revisão correspondente tiver sido concluída.

## Exceção odontológica importante

`platform_owner` continua sendo o administrador global, porém o acesso a dados clínicos é especializado por segurança: prontuários e mídia clínica devem passar por sessão explícita/auditável de suporte. Isso preserva o princípio global de administração da plataforma sem transformar prontuário em navegação casual.


A adoção do protocolo de pricing está registrada em `PRICING_PROTOCOL_ALIGNMENT.md`; isso não cria uma nova versão do Core.
