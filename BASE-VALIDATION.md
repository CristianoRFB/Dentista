# Base validation

- Core/doc standards check: OK (`node scripts/check-doc-standards.mjs`)
- JSON parse: OK
- TypeScript/TSX syntax: OK (34 arquivos, transpile local sem resolução de dependências)
- Diagramas canônicos `.dot`: 22
- Diagramas canônicos PNG: 22
- Wireframes PNG canônicos: 4
- Firestore rules presente: sim
- Firebase Storage deny-all presente: sim
- Worker R2 presente: sim
- Project Core v01: comparado e delta GLOBAL/VERTICAL documentado em `CORE_ALIGNMENT.md`
- Acessibilidade GLOBAL-v01: baseline aplicada
- Roadmap canônico: presente
- Standards tracking: GLOBAL-v01 / APPOINTMENT-v01 / DENTIST-v01
- Pricing protocol docs check: OK (`FEATURE_INVENTORY`, `PRICING_AND_PLANS`, `ENTITLEMENTS_DELTA`, `COMMERCIAL_DEMO`)
- Pricing proposal code: syntax OK; NÃO é entitlement runtime

## Limites desta validação

O ambiente de geração não concluiu `npm install` dentro do tempo disponível. Nesta revisão de pricing, `npm install --no-audit --no-fund` foi tentado novamente e também atingiu timeout; nenhum `node_modules`/lockfile foi incluído no ZIP. Portanto o build real com as dependências do `package.json` deve ser repetido em desenvolvimento/CI com:

```bash
npm install
npm run check:standards
npm test
npm run build
```

A checagem TypeScript local valida sintaxe/estrutura, mas não substitui resolução real dos tipos de React/Firebase nem testes no Emulator.

## Evidência visual

Screenshots reais continuam pendentes. Os wireframes e previews deste pacote não foram promovidos a evidência falsa de produção.
