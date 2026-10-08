import { auth } from '../../lib/firebase';

const baseUrl = import.meta.env.VITE_CLINICAL_MEDIA_API_URL;

async function authHeaders() {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Autenticação necessária');
  return { Authorization: 'Bearer ' + token };
}

export async function uploadClinicalPhoto(args: { tenantId: string; patientId: string; file: File }) {
  if (!baseUrl) throw new Error('A API de mídia clínica ainda não foi configurada.');
  const headers = await authHeaders();
  const form = new FormData();
  form.append('file', args.file);
  form.append('tenantId', args.tenantId);
  form.append('patientId', args.patientId);
  const response = await fetch(baseUrl.replace(/\/$/, '') + '/v1/media', { method: 'POST', headers, body: form });
  if (response.status === 403) throw new Error('Seu perfil não tem autorização clínica para este paciente.');
  if (!response.ok) throw new Error('O upload foi recusado (' + response.status + ').');
  return await response.json() as { photoId: string; objectKey: string };
}

export async function fetchClinicalPhoto(args: { tenantId: string; patientId: string; photoId: string }) {
  if (!baseUrl) throw new Error('A API de mídia clínica ainda não foi configurada.');
  const headers = await authHeaders();
  const url = new URL(baseUrl.replace(/\/$/, '') + '/v1/media/' + encodeURIComponent(args.photoId));
  url.searchParams.set('tenantId', args.tenantId);
  url.searchParams.set('patientId', args.patientId);
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error('A imagem não está disponível para esta sessão.');
  return URL.createObjectURL(await response.blob());
}
