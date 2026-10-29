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

/** Metadata-only review. Archival preserves the original R2 object and clinical history. */
export async function reviewClinicalPhoto(args:{
  tenantId:string; patientId:string; photoId:string; action:'verify'|'reject'|'archive'|'restore';
  reason:string; tags:string[];
}){
  if(!baseUrl) throw new Error('A API de mídia clínica ainda não foi configurada.');
  const headers=await authHeaders();
  const result=await fetch(baseUrl.replace(/\/$/,'')+'/v1/media/'+encodeURIComponent(args.photoId)+'/review',{
    method:'POST',headers:{...headers,'Content-Type':'application/json'},
    body:JSON.stringify({
      tenantId:args.tenantId,patientId:args.patientId,action:args.action,reason:args.reason,tags:args.tags,
    }),
  });
  if(result.status===403)throw new Error('Sem permissão clínica para revisar esta imagem.');
  if(result.status===409)throw new Error('Esta imagem mudou de estado. Atualize a lista e tente novamente.');
  if(result.status===404)throw new Error('Imagem não encontrada na clínica atual.');
  if(!result.ok)throw new Error('Falha ao registrar a ação de mídia ('+result.status+').');
  return await result.json() as {photoId:string;status:string;lifecycleStatus:string;revision:number};
}

/** Bounded read-only report. It NEVER repairs metadata or deletes files. */
export interface MediaIntegrityReport {
  tenantId:string; patientId:string; checkedMetadata:number; checkedObjects:number;
  complete:true; mode:'read_only'; noFilesModified:true;
  findings:Array<{kind:'missing_r2_object'|'unreferenced_r2_candidate'|'metadata_scope_mismatch';
    photoId?:string;objectKey?:string}>;
}
export async function inspectClinicalPhotoIntegrity(tenantId:string,patientId:string):Promise<MediaIntegrityReport>{
  if(!baseUrl)throw new Error('API clínica não configurada.');
  const headers=await authHeaders();
  const url=new URL(baseUrl.replace(/\/$/,'')+'/v1/media/integrity');
  url.searchParams.set('tenantId',tenantId);url.searchParams.set('patientId',patientId);
  const result=await fetch(url,{headers,cache:'no-store'});
  if(result.status===403)throw new Error('Sem permissão clínica para diagnóstico de integridade.');
  if(result.status===409)throw new Error('Inventário acima do limite seguro de 3.000 registros por origem. Solicite uma conferência operacional supervisionada.');
  if(!result.ok)throw new Error('Não foi possível verificar o inventário privado.');
  return result.json() as Promise<MediaIntegrityReport>;
}
