# v01 — Multi-Tenant White-Label

Primeira versão arquitetural canônica do OdontoFlow V2.

## Premissas

- repositório original vazio;
- Firebase Web configurado para `dentista-ee9db`;
- Multi-Tenant por aplicação;
- memberships por tenant;
- permissão granular como fonte de autorização;
- Patient separado de User;
- Professional separado de User;
- prontuário append-only + adendos;
- odontograma orientado a eventos + estado derivado;
- fotos clínicas em R2 privado + cache local;
- Platform Owner global, porém acesso clínico por sessão de suporte explícita;
- deploy frontend compartilhado na Cloudflare;
- sem Firebase/deploy separado por tenant.


## Padrões registrados

```txt
CORE_VERSION=v01
GLOBAL_STANDARD=GLOBAL-v01
VERTICAL_STANDARD=APPOINTMENT-v01
PRODUCT_STANDARD=DENTIST-v01
```

Consulte `STANDARDS.md` e `CORE_ALIGNMENT.md` antes de sincronizar novas decisões do ecossistema.


## Pricing / planos

Pacote executivo/técnico vigente:

- `PRICING_EXECUTIVE_PACKAGE.md`;
- `FEATURE_MATRIX.md`;
- `PRICING_AND_PLANS.md`;
- `DELTA_TECNICO.md`;
- `PRIORIZACAO.md`;
- `DECISOES_PRICING.md`;
- GOAL ativo para Codex: `../../../../CODEX_GOAL_IMPLEMENTACAO_DENTISTA.txt` (CORE_FIRST). O GOAL antigo de pricing foi movido para `docs/historical/` e NÃO deve ser executado agora.

Planos e preços continuam como proposta/recomendação. Entitlements e cobrança real não estão implementados.
