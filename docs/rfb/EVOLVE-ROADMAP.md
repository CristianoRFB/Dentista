# OdontoFlow — sequência EVOLVE

Método main: 5f73ee2b48507234431706e4c6313773bae72a5a. Baseline: bdd33296b2dc0a3f3abc2ff33dbe50706e8514f5. PR #4 (draft). Escopo: completar produto existente, sem alterar planos, cobrança, dados reais ou produção.

| EVOLVE | Entrega | Aceite | Estado inicial |
|---|---|---|---|
| 01 | Proteção de mídia sem binding | CI e regressões | CI PASS, hosted pendente |
| 02 | JWT Firebase | CI e casos negativos | CI PASS, hosted pendente |
| 03 | Manifesto backup | CI e restauração sintética | CI PASS, R2 real bloqueado |
| 04 | Agenda/pacientes | Busca, data, bordas e regressões | CI e Chromium PASS no candidato 3dc4345 |
| 05 | Visual Excellence | Capturas reais desktop/mobile, revisão de pixels e correções | Correções anteriores verificadas em 30 capturas; nova galeria S008 pendente |
| 06 | QA integral | Triple Verification por jornada, isolamento e ambiente hospedado | PARCIAL — CI/Chromium anteriores PASS; TV integral pendente |
| 07 | Release comercial | Checklist, preços preservados, gates completos e autorização | BLOCKED — preparação documentada |

| 08 | Busca de fotos e consistência de seleção | Aliases, visibilidade, prévias, lote e acessibilidade | IMPLEMENTADA — CI/recaptura pendentes |

CI não comprova produção nem aceite visual. Não promover etapas dependentes sem evidência. R2 não habilitado; Firestore/Auth hospedados não comprovados; sem billing, merge ou deploy automático.
