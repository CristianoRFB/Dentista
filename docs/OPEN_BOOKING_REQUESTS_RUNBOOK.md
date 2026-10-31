# D4 — Solicitação pública de agendamento (opt-in e antiabuso)

**Status:** código na branch de PR, sem deploy nem homologação hospedada. Esta é uma **solicitação de contato**, não uma reserva: não cria agendamento, paciente, bloqueio de agenda, procedimento ou cobrança.

## Fluxo implementado

1. Tenant owner ativo, com permissão `tenant.manage`, habilita `openBookingRequestsEnabled: true` em `tenants/{tenantId}/publicProfile/public` pelo painel Convites de agenda, com auditoria. Ausente/falso: desativado por padrão.
2. O mini-site público mostra o CTA somente quando opt-in e `VITE_TURNSTILE_SITE_KEY` estão presentes.
3. Formulário solicita nome, telefone, e-mail opcional, hora preferida (não confirmada) e Turnstile. Não solicita informações de saúde.
4. Worker valida tamanho e estrutura, origin allowlist, IP confiável `CF-Connecting-IP`, binding `OPEN_BOOKING_RATE_LIMITER`, desafio Turnstile via `siteverify` com `success=true`, `hostname` autorizado e `action=open_booking_request`. Qualquer ausência de configuração falha fechado.
5. Worker verifica tenant ativo, plano com `agenda`, slug e perfil opt-in. A transação Firestore revalida slug, status e opt-in antes do commit, e grava `openBookingRequests/{uuid}` pendente + auditoria, **sem criar appointments ou scheduleLocks**.
6. Equipe com `appointments.read` vê fila privada da própria clínica; `appointments.manage` pode marcar `contacted`/`dismissed` com auditoria na mesma transação. Para agendar, equipe usa o fluxo autenticado da agenda e checagem de conflitos existente.

## Provisionamento de staging — somente após aprovação operacional

- Criar widget Turnstile para o host real da aplicação. Configurar `VITE_TURNSTILE_SITE_KEY` no build frontend (pública) e `TURNSTILE_SECRET_KEY` como secret no Worker (nunca no Git).
- Configurar `APP_ORIGIN` com host(s) HTTPS exato(s) da aplicação; não usar wildcard.
- Configurar um Rate Limiter separado no Wrangler do Worker. Exemplo **não aplicado automaticamente** (namespace deve ser exclusivo e revisado):

```toml
[[ratelimits]]
name = "OPEN_BOOKING_RATE_LIMITER"
namespace_id = "1002"

[ratelimits.simple]
limit = 5
period = 60
```

- **Aviso:** Cloudflare Rate Limiting API é aproximada e restrita à localização de borda; não estabelece limite global exato. Combine Turnstile, Rate Limiting, WAF/alertas e políticas operacionais; nunca prometa cinco solicitações globais exatas.
- Validar `CF-Connecting-IP` no deploy. Sem IP ou token, sem secret, sem binding, sem opt-in, com demo ou tenant inativo, o Worker não aceita o pedido.
- Executar teste real em staging usando apenas dados fictícios, dois tenants, Turnstile real, cooldown, replay de token, revogação de opt-in concorrente, auditoria e revisão na fila.

## Contratos

- `POST /v1/public/booking-requests` sem Firebase Auth: `{tenantSlug,name,phone,email,preferredAt,turnstileToken}`; `preferredAt` ISO UTC entre 5 min e 60 dias. Resposta `202 {received:true,notConfirmed:true}`. 400 input, 403 human/origin, 404 não habilitado, 429 throttled, 503 proteção indisponível.
- Firestore `tenants/{tenantId}/openBookingRequests/{uuid}`: SDK cliente não pode criar ou excluir; acesso da equipe por `appointments.read`, revisão de pendente a contatado/dispensado apenas com `appointments.manage` e audit log. Sem alteração de appointment ou paciente.
- Opt-in `openBookingRequestsEnabled`: bool opcional nas regras de perfil público, atualizado apenas pelo tenant owner com registro `publicProfile.update`.

## Limitações e decisões de segurança

- **Não é confirmação automática de horário**, não oferece horários disponíveis nem substitui link individual.
- Não verifica titularidade de e-mail/telefone, não notifica WhatsApp, não implementa retenção de dados pessoais nem rastreio antifraude sofisticado. Limitar informações e definir política LGPD/retention antes de produção.
- IP é usado somente para limitação operacional na borda; não é persistido com a solicitação. Captcha também não é salvo.
- Sem provisionamento e validação externa real, nenhuma alegação de uso em produção.

## Ciência do uso de contato
O formulário contém confirmação obrigatória de que a pessoa está ciente do uso dos contatos para responder ao pedido. O Worker rejeita explicitamente `contactAcknowledged !== true` e grava o sinalizador sem incluir texto clínico. **Isto não substitui aviso de privacidade institucional, revisão de base legal, retenção/eliminação e controles LGPD operacionais.**

## Defesa complementar de ativação (31/10/2026)

As regras Firestore exigem **membership ativa com papel tenant_owner e permissão tenant.manage** para qualquer alteração em `openBookingRequestsEnabled`. A plataforma continua autorizada a atualizar o branding com auditoria quando não muda o sinalizador, mas **não** pode habilitar ou desabilitar o recebimento público em nome da clínica. Criação do perfil público é sempre com opt-in ausente/falso. O Worker permanece independente: exige sinalizador verdadeiro, Turnstile, throttling e tenant ativo. Testes negativos e positivos pelo Firestore Emulator em `tests/firestoreRules.test.ts`.
