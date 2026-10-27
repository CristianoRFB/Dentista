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
