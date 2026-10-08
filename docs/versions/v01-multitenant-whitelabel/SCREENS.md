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
| Fotos clínicas | `/{tenantSlug}/app/pacientes/{patientId}/fotos` | upload/preview autenticados via Worker e R2 privado | Não arquivada |
| Recursos | `/{tenantSlug}/app/recursos` | CRUD mínimo | Não arquivada |
| Cadastros | `/{tenantSlug}/app/cadastros` | profissionais/procedimentos/equipe | Não arquivada |
| Site público do tenant | `/{tenantSlug}` | perfil público real; agendamento e intake para tenants reais indisponíveis | Não arquivada |

## Limitação de captura

O Vite foi executado em modo demo de desenvolvimento com dados fictícios e a interface do tenant foi inspecionada no navegador. A captura foi exibida na sessão, porém a política do navegador bloqueou exportá-la para o workspace e proibiu tentativas equivalentes. Por isso, não há screenshot arquivado nesta versão; esta limitação não é tratada como evidência visual concluída. A tela Platform Owner também não foi inspecionada visualmente por falta de uma sessão autenticada correspondente.

Não referenciar wireframe ou imagem conceitual como screenshot real. Os visuais em `generated/` são materiais de conceito separados.

Central de Retorno permanece somente leitura. `/agendar` e `/cadastro` não persistem dados para tenants reais. Portal do paciente, odontograma e tratamento não são fluxos operacionais.
