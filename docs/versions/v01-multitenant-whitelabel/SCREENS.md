# Telas

Categorias: PLATFORM, TENANT ADMIN, CLINICAL, RECEPTION, PATIENT e PUBLIC. Wireframes iniciais estão em `docs/initial/screens/mockups/`.


## Revisão comercial

Novas superfícies planejadas/scaffolded:

- Landing comercial principal;
- páginas públicas por recurso;
- estrutura de preços/planos;
- Central de retorno;
- Cadeiras e salas;
- pré-cadastro do paciente por link;
- painel de uso no Platform Admin.

A landing deve usar screenshots reais quando o produto estiver implementado; os previews atuais são demonstrações do scaffold.

- Mini-site público do tenant (`/{tenantSlug}`);
- fluxo público de agendamento (`/{tenantSlug}/agendar`).

## Estado real após Core P0

| Tela | Rota | Estado real | Screenshot |
|---|---|---|---|
| Login | `/login` | Firebase Auth email/senha | `screenshots/login-desktop.png` |
| Platform Owner | `/platform` | listagem/criação/status/branding/suporte auditados | `screenshots/platform-owner-desktop.png` |
| Dashboard tenant | `/{tenantSlug}/app` | resumo tenant-scoped | `screenshots/tenant-dashboard-desktop.png`, `screenshots/tenant-dashboard-mobile.png` |
| Agenda | `/{tenantSlug}/app/agenda` | persistência e conflito pelo Worker | `screenshots/agenda-desktop.png`, `screenshots/agenda-mobile.png` |
| Pacientes | `/{tenantSlug}/app/pacientes` | CRUD mínimo e inativação sem delete | `screenshots/patients-desktop.png` |
| Prontuário | `/{tenantSlug}/app/pacientes/{patientId}/clinico` | notas append-only e adendos | `screenshots/clinical-record-desktop.png` |
| Fotos clínicas | `/{tenantSlug}/app/pacientes/{patientId}/fotos` | upload/preview autenticados em tenant real | — |
| Recursos | `/{tenantSlug}/app/recursos` | CRUD mínimo | `screenshots/resources-desktop.png` |
| Cadastros | `/{tenantSlug}/app/cadastros` | profissionais/procedimentos/equipe | `screenshots/catalogs-desktop.png` |
| Site público | `/{tenantSlug}` | publicProfile real; booking/intake conectados indisponíveis | `screenshots/tenant-public-desktop.png` |

Capturas são do aplicativo executado no servidor Vite, em modo demo de desenvolvimento explícito, somente com Clínica Aurora e registros fictícios. O screenshot do Platform Owner pode usar dados do Emulator se houver seed adequado; em ausência de seed, documentar como indisponível em vez de fabricar tela. Nenhum wireframe entra nesta tabela como evidência.

Central de Retorno segue somente leitura; `/agendar` e `/cadastro` não criam dados para tenants reais. Portal do paciente e odontograma/tratamento não existem como fluxos operacionais.
