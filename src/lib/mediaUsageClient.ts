import { auth } from './firebase';
import type { TenantAccessState } from '../modules/tenant/tenantResolver';
import { requirePermission, requireReady } from './tenantDataCore';

const BASE=import.meta.env.VITE_CLINICAL_MEDIA_API_URL;
const MAX_PAGES_PER_SCAN=20;

export interface TenantMediaUsageScan {
  objectCount:number;
  bytes:number;
  complete:boolean;
  nextCursor?:string;
  pagesScanned:number;
}

/**
 * Resumable, owner-authorized estimate of R2 clinical photo bytes.
 * Each page is independently observed. A complete scan is NOT an atomic snapshot
 * and is not proof of backup, retention, quota or billing correctness.
 */
export async function scanTenantMediaUsage(
  session:TenantAccessState,previous?:TenantMediaUsageScan,
):Promise<TenantMediaUsageScan> {
  const ready=requireReady(session);
  requirePermission(ready,'usage.read');
  if(!BASE)throw new Error('API de mídia não configurada.');
  if(previous?.complete)return previous;
  const identity=await auth.currentUser?.getIdToken();
  if(!identity)throw new Error('Autenticação obrigatória.');
  let result:TenantMediaUsageScan={
    objectCount:previous?.objectCount??0,
    bytes:previous?.bytes??0,
    pagesScanned:previous?.pagesScanned??0,
    complete:false,nextCursor:previous?.nextCursor,
  };
  const cursors=new Set<string>();
  for(let page=0;page<MAX_PAGES_PER_SCAN;page++){
    const url=new URL(BASE.replace(/\/$/,'')+'/v1/media/usage');
    url.searchParams.set('tenantId',ready.tenant.id);
    if(result.nextCursor){
      if(cursors.has(result.nextCursor))throw new Error('Paginação de mídia inconsistente.');
      cursors.add(result.nextCursor);
      url.searchParams.set('cursor',result.nextCursor);
    }
    const response=await fetch(url.toString(),{
      headers:{Authorization:'Bearer '+identity},cache:'no-store',
    });
    if(response.status===403)throw new Error('Apenas o responsável autorizado pode medir o uso da clínica.');
    if(!response.ok)throw new Error('Não foi possível medir o armazenamento R2.');
    const data=await response.json() as {tenantId?:unknown;objectCount?:unknown;bytes?:unknown;hasMore?:unknown;nextCursor?:unknown};
    if(data.tenantId!==ready.tenant.id || !Number.isSafeInteger(data.objectCount) ||
      (data.objectCount as number)<0 || !Number.isSafeInteger(data.bytes) || (data.bytes as number)<0 ||
      typeof data.hasMore!=='boolean'|| (data.hasMore && (typeof data.nextCursor!=='string'||!data.nextCursor)))
      throw new Error('A API retornou uma medição inválida.');
    const count=result.objectCount+(data.objectCount as number);
    const bytes=result.bytes+(data.bytes as number);
    if(!Number.isSafeInteger(count)||!Number.isSafeInteger(bytes))throw new Error('Medição excedeu o limite numérico.');
    result={
      objectCount:count,bytes,pagesScanned:result.pagesScanned+1,
      complete:!data.hasMore,nextCursor:data.hasMore?data.nextCursor as string:undefined,
    };
    if(result.complete)return result;
  }
  return result; // Partial: the UI must explicitly say so and offer continuation.
}
