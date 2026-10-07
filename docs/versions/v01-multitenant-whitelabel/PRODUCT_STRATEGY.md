# Product strategy — SaaS Dentista

## Direção do produto

A fundação continua sendo um SaaS odontológico Multi-Tenant White-Label, mas a experiência deve ser pensada como **produto comercial demonstrável**, não como uma coleção de CRUDs.

A comunicação pública prioriza o problema resolvido e mostra o software em contexto:

- agenda → menos conflitos e mais previsibilidade;
- prontuário → histórico organizado e rastreável;
- fotos clínicas → evolução visual em contexto;
- odontograma → estado atual explicável pelo histórico;
- tratamento → planejamento e execução conectados;
- retornos → pacientes que precisam voltar sem depender da memória.

## Núcleo V1

1. Multi-Tenant + White-Label.
2. Platform Owner.
3. Profissionais e memberships.
4. Pacientes.
5. Agenda com recursos físicos opcionais (cadeira/sala).
6. Prontuário append-only + adendos.
7. Odontograma orientado a eventos.
8. Fotos e exames com R2 privado + cache local.
9. Plano de tratamento básico.
10. Documentos/anexos.
11. Central de retorno.
12. Pré-cadastro por link com revisão da recepção.

## Fora do V1 por padrão

Estoque, comissões, emissão fiscal, chat interno, automações complexas, IA, marketplace, multi-unidade e integrações financeiras profundas só devem entrar com demanda real.

## Comercial sem acoplamento técnico

Planos são mapeamentos de `tenant.features` + `tenant.limits`, não `if (plan === 'pro')` espalhado no produto.

Custos variáveis futuros devem poder ser medidos em `tenant.usage`, por exemplo:

- mensagens oficiais;
- minutos/processamentos de IA;
- armazenamento adicional;
- emissões fiscais.

## Estratégia de planos após protocolo global

A vertical adota três degraus comerciais como hipótese inicial:

```text
Essencial -> resolve o núcleo clínico
Pro -> operação em equipe / growth
Premium -> gestão e escala
```

A herança comercial é cumulativa, mas o marketing deve respeitar o estado real de cada feature. Segurança, histórico clínico, isolamento e integridade não são vendidos como exclusividade Premium.

A proposta completa está em `PRICING_AND_PLANS.md`.
