import { auth } from './firebase';
import type { TenantAccessState } from '../modules/tenant/tenantResolver';

export type TenantCapacityKind = 'professionals' | 'resources' | 'memberships';

const apiBaseUrl = import.meta.env.VITE_CLINICAL_MEDIA_API_URL;

const messages: Record<string, string> = {
  commercial_limit_reached: 'O limite ativo deste plano foi atingido. Inative um cadastro ou peça ao Platform Owner para revisar o plano.',
  commercial_status_blocks_new_capacity: 'O estado comercial deste tenant não permite adicionar ou reativar capacidade agora.',
  owner_role_assignment_restricted: 'Somente o Platform Owner pode atribuir o papel de responsável da clínica.',
  feature_not_available: 'Este recurso não está disponível para o plano atual.',
  capacity_permission_required: 'Seu perfil não tem permissão para alterar este cadastro.',
  invalid_membership: 'Os dados da membership não são válidos.',
  invalid_professional: 'Informe um nome válido para o profissional.',
  invalid_resource: 'Informe um nome e tipo válidos para o recurso.',
};

export async function mutateTenantCapacity(
  session: TenantAccessState,
  kind: TenantCapacityKind,
  operation: 'create' | 'activate' | 'deactivate' | 'update',
  values: Record<string, unknown>,
  recordId?: string,
) {
  if (session.status !== 'ready' || session.isDemo) throw new Error('Cadastros da demonstração são somente para leitura.');
  const endpoint = apiBaseUrl?.replace(/\/$/, '') + '/v1/tenants/capacity';
  if (!apiBaseUrl) throw new Error('A API segura de cadastros ainda não foi configurada.');
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Autenticação necessária.');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId: session.tenant.id, kind, operation, recordId, values }),
  });
  const result = await response.json().catch(() => ({})) as { id?: string; error?: string; count?: number; limit?: number };
  if (!response.ok) throw new Error(messages[result.error ?? ''] ?? 'Não foi possível salvar o cadastro (' + response.status + ').');
  return result;
}
