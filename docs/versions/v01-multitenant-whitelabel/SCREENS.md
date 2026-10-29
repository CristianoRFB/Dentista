# Telas e evidência visual

Categorias: PLATFORM, TENANT ADMIN, CLINICAL, RECEPTION, PATIENT e PUBLIC. Wireframes iniciais permanecem em `wireframes/`; não são evidência de implementação.

## Estado após Core P0

| Tela | Rota | Estado no produto | Evidência de screenshot persistida |
|---|---|---|---|
| Login | `/login` | Firebase Auth email/senha e guards | Não arquivada; em modo demo a rota redireciona para o tenant |
| Platform Owner | `/platform` | listar/criar/ativar/suspender tenants, branding e suporte auditado | Não capturada; sem sessão Platform Owner no navegador de desenvolvimento |
| Dashboard tenant | `/{tenantSlug}/app` | resumo tenant-scoped | Tela real inspecionada no navegador demo; arquivo não arquivado |
| Agenda | `/{tenantSlug}/app/agenda` | persistência e conflito tratados pelo Worker | Não arquivada |
| Pacientes | `/{tenantSlug}/app/pacientes` | CRUD mínimo e inativação sem delete | Não arquivada |
| Prontuário | `/{tenantSlug}/app/pacientes/{patientId}/clinico` | notas append-only e adendos | Não arquivada |
| Fotos clínicas | `/{tenantSlug}/app/pacientes/{patientId}/fotos` | upload/preview privados, listagem progressiva de 8 imagens, revisão clínica e diagnóstico R2 × Firestore limitado (somente leitura) | Não arquivada; homologação hospedada pendente |
| Recursos | `/{tenantSlug}/app/recursos` | CRUD mínimo | Não arquivada |
| Cadastros | `/{tenantSlug}/app/cadastros` | profissionais/procedimentos/equipe | Não arquivada |
| Site público do tenant | `/{tenantSlug}` | perfil público real; agendamento e intake para tenants reais indisponíveis | Não arquivada |
| Preços | `/precos` | preços, limites, disponibilidade e contratação manual | Inspecionada em Vite local com configuração fictícia; screenshot exibido nesta sessão, não arquivado |

## Limitação de captura

O Vite foi executado em modo demo de desenvolvimento com dados fictícios. Nesta atualização, a página `/precos` foi inspecionada visualmente no navegador local e a captura foi exibida nesta sessão. A ferramenta de navegador não disponibilizou uma operação para salvar essa imagem no workspace; não há screenshot arquivado nesta versão. As demais capturas continuam pendentes. A tela Platform Owner também não foi inspecionada visualmente por falta de uma sessão autenticada correspondente.

Não referenciar wireframe ou imagem conceitual como screenshot real. Os visuais em `generated/` são materiais de conceito separados.

Central de Retorno possui fluxo interno de criação/atualização por equipe autorizada na branch de implementação; captura de screenshot real ainda pendente. `/agendar?token=...` cria agendamento real por convite pessoal, com anti-double-booking e consumo transacional; `/app/convites-agenda` emite convites; agendamento aberto sem convite ainda não disponível; `/cadastro?token=...` recebe contatos via Worker e `/app/pre-cadastros` permite revisão autenticada Pro, sem screenshot real arquivada. Portal do paciente ainda não é fluxo operacional. Planos de tratamento e orçamentos Pro possuem rota persistida e auditada na branch, sem screenshot real arquivada. O odontograma FDI tem tela clínica e persistência append-only na branch de desenvolvimento, com screenshot real ainda não arquivada.


## Cobertura automatizada de telas (implementação 29/10/2026)

- `scripts/capture-demo-screenshots.mjs` abre Vite em modo desenvolvimento com `VITE_USE_DEMO_DATA=true`, e o workflow `.github/workflows/visual-qa.yml` aciona Chromium para visitar seis rotas reais de demonstração em desktop (1365×850) e mobile (390×844).
- O script exige cabeçalho real da rota e estado fictício nas telas clínicas; caso haja erro ou redirecionamento indevido, o teste falha em vez de arquivar uma imagem enganosa.
- Capturas são classificadas `SCREENSHOT_REAL_DEMO` no `SCREENSHOTS_MANIFEST.json` e mantidas em artefato temporário GitHub Actions, **não** dentro de `docs/screenshots/` enquanto não forem revisadas e persistidas na versão vigente.
- Não capturar tokens de convite, contas reais, dados clínicos reais nem Platform Owner. Essas telas exigem homologação própria para gerar evidência verdadeira.
