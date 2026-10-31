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
  snapshotConsistent:false;limit:number;warning:string;
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

export interface ClinicalBackupManifest {digest:string;sizeBytes:number;createdAt:string|null}
export interface ClinicalBackupList {
  records:ClinicalBackupManifest[];nextPageToken:string|null;hasMore:boolean;photoId:string;private:true;
}
export interface BackupScope {tenantId:string;patientId:string;photoId:string}
async function backupApi<T>(route:string,payload:Record<string,unknown>):Promise<T>{
  if(!baseUrl)throw Error('API clínica não configurada.');
  const token=await authHeaders();
  const response=await fetch(baseUrl.replace(/\/$/,'')+route,{
    method:'POST',headers:{...token,'Content-Type':'application/json'},cache:'no-store',
    body:JSON.stringify(payload),
  });
  if(response.status===403)throw Error('Apenas dentistas autorizados podem executar operações de backup.');
  if(response.status===409)throw Error('Ação bloqueada: verifique a integridade, o estado do arquivo e o manifesto.');
  if(response.status===503)throw Error('Backup indisponível: configure um bucket R2 secundário privado e valide a API.');
  if(!response.ok)throw Error('Operação de backup não concluída ('+response.status+').');
  return response.json() as Promise<T>;
}
export const listPhotoBackups=(scope:BackupScope,pageToken?:string)=>backupApi<ClinicalBackupList>(
  '/v1/media/backups/list',{...scope,...(pageToken?{pageToken}:{})});
export const createPhotoBackup=(scope:BackupScope,reason:string)=>backupApi<{
  photoId:string;digest:string;verified:true;alreadyBackedUp:boolean;
}>('/v1/media/backups',{...scope,reason});
export const recoverMissingPhoto=(scope:BackupScope,digest:string,reason:string)=>backupApi<{
  photoId:string;digest:string;restored:true;verified:true;
}>('/v1/media/backups/restore',{...scope,digest,reason});

export interface BatchBackupReport {
  succeeded:number;failed:number;complete:boolean;private:true;automatic:false;noOriginalsModified:true;
  items:Array<{photoId:string;status:'verified'|'failed';digest?:string;alreadyBackedUp?:boolean;
    sizeBytes?:number;error?:string}>;
}
export const createPatientBackupBatch=(tenantId:string,patientId:string,photoIds:string[],reason:string)=>
  backupApi<BatchBackupReport>('/v1/media/backups/batch',{tenantId,patientId,photoIds,reason});
