/**
 * D5 — explicit, bounded, content-addressed R2 backups.
 * No periodic run, storage quota, expiry, object deletion or public URL.
 * The second bucket must be provisioned separately and kept private.
 */
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const DIGEST = /^[a-f0-9]{64}$/;
export const MAX_BACKUP_PHOTO_BYTES = 15 * 1024 * 1024;

export interface BackupInput {
  tenantId:string;patientId:string;photoId:string;reason:string;digest?:string;
}
export function validateBackupInput(raw:unknown, restore=false):BackupInput {
  if(!raw || typeof raw!=='object' || Array.isArray(raw))throw Error('invalid_backup_request');
  const data=raw as Record<string,unknown>;
  const allowed=restore?['tenantId','patientId','photoId','reason','digest']:['tenantId','patientId','photoId','reason'];
  if(Object.keys(data).some(key=>!allowed.includes(key)))throw Error('invalid_backup_request');
  for(const id of ['tenantId','patientId','photoId'])if(typeof data[id]!=='string'||!ID.test(data[id]))throw Error('invalid_backup_request');
  if(typeof data.reason!=='string'||data.reason.trim().length<12||data.reason.length>500)throw Error('invalid_backup_request');
  if(restore && (typeof data.digest!=='string'||!DIGEST.test(data.digest)))throw Error('invalid_backup_request');
  return {tenantId:data.tenantId as string,patientId:data.patientId as string,
    photoId:data.photoId as string,reason:(data.reason as string).trim(),
    ...(restore?{digest:data.digest as string}:{})};
}

export function backupKeyFor(input:BackupInput,digest:string) {
  if(!DIGEST.test(digest)||![input.tenantId,input.patientId,input.photoId].every(id=>ID.test(id)))
    throw Error('invalid_backup_key');
  return 'snapshots/tenants/'+input.tenantId+'/patients/'+input.patientId+
    '/photos/'+input.photoId+'/sha256-'+digest;
}

export function expectedMediaPrefix(input:BackupInput) {
  return 'tenants/'+input.tenantId+'/patients/'+input.patientId+'/';
}

export async function sha256Hex(value:ArrayBuffer):Promise<string> {
  const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',value));
  return Array.from(hash,b=>b.toString(16).padStart(2,'0')).join('');
}

export async function boundedImageBytes(object:{body:ReadableStream<Uint8Array>|null;size?:number}|null) {
  if(!object?.body)throw Error('backup_object_unavailable');
  // Reject declared oversized R2 objects before touching their payload.
  if(object.size!==undefined && (!Number.isSafeInteger(object.size) ||
    object.size<1 || object.size>MAX_BACKUP_PHOTO_BYTES))
    throw Error('backup_invalid_object_size');
  const reader=object.body.getReader();
  const chunks:Uint8Array[]=[];
  let total=0,finished=false;
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done){finished=true;break;}
      if(!(value instanceof Uint8Array))throw Error('backup_invalid_stream_chunk');
      total+=value.byteLength;
      if(!Number.isSafeInteger(total)||total>MAX_BACKUP_PHOTO_BYTES)
        throw Error('backup_invalid_object_size');
      // Copy: a producer is allowed to reuse the underlying chunk buffer.
      chunks.push(new Uint8Array(value));
    }
  }finally{
    if(!finished)await reader.cancel().catch(()=>{});
    reader.releaseLock();
  }
  if(total===0 || (object.size!==undefined && total!==object.size))
    throw Error('backup_invalid_object_size');
  const output=new Uint8Array(total);
  let offset=0;
  for(const part of chunks){output.set(part,offset);offset+=part.byteLength;}
  return output.buffer;
}

/** Read-back check of destination; R2 metadata/etag alone is insufficient. */
export async function verifiedBackupBytes(bucket:R2Bucket,key:string,digest:string) {
  const object=await bucket.get(key);
  const bytes=await boundedImageBytes(object);
  if(await sha256Hex(bytes)!==digest)throw Error('backup_checksum_mismatch');
  return bytes;
}

/** Maximum five independent originals per request, to bound CPU, memory and R2 cost. */
export const MAX_BACKUP_BATCH_PHOTOS=5;
export function validateBackupBatchInput(raw:unknown):{
  tenantId:string;patientId:string;photoIds:string[];reason:string;
}{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('invalid_backup_batch');
  const r=raw as Record<string,unknown>;
  if(Object.keys(r).some(key=>!['tenantId','patientId','photoIds','reason'].includes(key)))
    throw Error('invalid_backup_batch');
  if(!Array.isArray(r.photoIds)||r.photoIds.length<1||r.photoIds.length>MAX_BACKUP_BATCH_PHOTOS||
    r.photoIds.some(id=>typeof id!=='string'||!ID.test(id))||
    new Set(r.photoIds).size!==r.photoIds.length)throw Error('invalid_backup_batch');
  const input=validateBackupInput({tenantId:r.tenantId,patientId:r.patientId,photoId:r.photoIds[0],reason:r.reason});
  return {tenantId:input.tenantId,patientId:input.patientId,photoIds:[...r.photoIds],reason:input.reason};
}
