/** Bounded, read-only R2/Firestore comparison. Findings are candidates, never deletion instructions. */
export type MediaInventoryRecord = {id:string;tenantId?:unknown;patientId?:unknown;objectKey?:unknown};
export type MediaIntegrityFinding = {
  kind:'missing_r2_object'|'unreferenced_r2_candidate'|'metadata_scope_mismatch';
  photoId?:string;
  objectKey?:string;
};

export function comparePatientMediaInventory(
  tenantId:string,patientId:string,metadata:readonly MediaInventoryRecord[],r2Keys:readonly string[],
): MediaIntegrityFinding[] {
  const prefix=`tenants/${tenantId}/patients/${patientId}/`;
  const byKey=new Set<string>();
  const findings:MediaIntegrityFinding[]=[];
  const R2=new Set(r2Keys);
  for(const record of metadata){
    const key=record.objectKey;
    if(record.tenantId!==tenantId || record.patientId!==patientId
      ||typeof key!=='string' ||!key.startsWith(prefix)){
      findings.push({kind:'metadata_scope_mismatch',photoId:record.id});
      continue;
    }
    byKey.add(key);
    if(!R2.has(key)) findings.push({kind:'missing_r2_object',photoId:record.id,objectKey:key});
  }
  for(const key of R2){
    if(key.startsWith(prefix)&&!byKey.has(key))
      findings.push({kind:'unreferenced_r2_candidate',objectKey:key});
  }
  return findings;
}


/** Limits avoid excessive costs/CPU while still allowing several pages of clinical media. */
export const MEDIA_METADATA_PAGE_SIZE=100;
export const MEDIA_R2_PAGE_SIZE=500;
export const MAX_MEDIA_INVENTORY_ITEMS=3000;
export type MediaInventoryPage<T>={items:T[];nextCursor?:string};
export async function collectMediaInventoryPages<T>(
  fetchPage:(cursor?:string)=>Promise<MediaInventoryPage<T>>,
  maximum=MAX_MEDIA_INVENTORY_ITEMS,
):Promise<T[]>{
  if(!Number.isSafeInteger(maximum)||maximum<1)throw new Error('invalid_inventory_limit');
  const seen=new Set<string>();
  const result:T[]=[];
  let cursor:string|undefined=undefined;
  for(;;){
    const page=await fetchPage(cursor);
    if(!page||!Array.isArray(page.items))throw new Error('invalid_inventory_page');
    if(page.items.length===0 && page.nextCursor)throw new Error('empty_inventory_page_with_cursor');
    if(result.length+page.items.length>maximum)throw new Error('inventory_exceeds_safe_limit');
    result.push(...page.items);
    if(!page.nextCursor)return result;
    if(page.nextCursor===cursor || seen.has(page.nextCursor))throw new Error('inventory_cursor_loop');
    seen.add(page.nextCursor);
    cursor=page.nextCursor;
  }
}
