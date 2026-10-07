# Marketing site / landing comercial

## Benchmark de estrutura

A referência analisada em 2026-10-05 foi a landing pública do Codental (`https://www.codental.com.br/`) e sua página de preços (`https://www.codental.com.br/preco`).

A decisão NÃO é copiar textos, identidade, imagens ou componentes. O benchmark é usado para aprender a **apresentar produto**:

1. benefício antes de especificação técnica;
2. software aparecendo na página;
3. recursos organizados por problema que resolvem;
4. prova social só quando houver evidência real;
5. planos comparáveis e fáceis de entender;
6. serviços de custo variável separados da mensalidade;
7. páginas específicas de recursos para aprofundamento e SEO.

## Rotas comerciais previstas

- `/` — landing principal;
- `/precos` — estrutura de planos com preços PROPOSTOS claramente rotulados;
- `/recursos/agenda`;
- `/recursos/prontuario`;
- `/recursos/odontograma`;
- `/recursos/fotos-clinicas`;
- `/recursos/tratamentos`.

## Regra de conteúdo

Enquanto não existirem números reais de clientes, avaliações ou resultados, a landing não deve inventar:

- quantidade de clínicas;
- quantidade de dentistas;
- avaliações;
- economia percentual;
- aumento de receita;
- redução de faltas.

A área de prova deve usar apenas evidência verificável.

## Linguagem visual

- clínica sem parecer hospital genérico;
- bastante espaço em branco;
- verde profundo + tons suaves como identidade provisória;
- tipografia forte e limpa;
- screenshots/product previews grandes;
- poucos ícones decorativos;
- nada de “dentinho voando” como linguagem dominante;
- animação discreta quando houver.

## Hero

Mensagem-base de trabalho:

> Sua clínica organizada. Seu paciente bem acompanhado.

Ela é original deste projeto e pode mudar após validação comercial.


## Site público de cada tenant

Além da landing da plataforma, cada clínica pode ter um mini-site white-label em `/{tenantSlug}`, com serviços publicados, profissionais, contato e CTA para `/{tenantSlug}/agendar`. O agendamento público não deve escrever diretamente no Firestore sem validação confiável.

## Pricing após protocolo global

A rota `/precos` passa a ter dois objetivos nesta fundação:

1. demonstrar a estrutura comercial pretendida;
2. deixar explícito que ainda não existe checkout/entitlement de produção.

Valores propostos para teste:

- Essencial: R$ 79,90/mês;
- Pro: R$ 129,90/mês;
- Premium: R$ 189,90/mês;
- anual: hipótese de 10% de desconto.

Enquanto `ENTITLEMENTS_DELTA.md` estiver pendente, o CTA principal continua sendo demonstração/interesse, nunca “assinar agora”.
