import { describe, expect, it } from 'vitest';
import { comparePatientMediaInventory } from '../workers/media-api/src/mediaIntegrity';
const prefix='tenants/A/patients/patient-a/';
describe('D5 media inventory reconciliation',()=>{
  it('distinguishes matched records, missing bytes and orphan candidates without modifying anything',()=>{
    const records=[
      {id:'photo-1',tenantId:'A',patientId:'patient-a',objectKey:prefix+'photo-1.jpg'},
      {id:'photo-2',tenantId:'A',patientId:'patient-a',objectKey:prefix+'photo-2.jpg'},
    ];
    expect(comparePatientMediaInventory('A','patient-a',records,[
      prefix+'photo-1.jpg',prefix+'orphan.jpg',
    ])).toEqual([
      {kind:'missing_r2_object',photoId:'photo-2',objectKey:prefix+'photo-2.jpg'},
      {kind:'unreferenced_r2_candidate',objectKey:prefix+'orphan.jpg'},
    ]);
    expect(records).toHaveLength(2);
  });
  it('flags cross-tenant metadata and never scans foreign prefix',()=>{
    expect(comparePatientMediaInventory('A','patient-a',[
      {id:'bad',tenantId:'B',patientId:'patient-a',objectKey:'tenants/B/patients/patient-a/photo.jpg'},
    ],['tenants/B/patients/patient-a/secret.jpg'])).toEqual([
      {kind:'metadata_scope_mismatch',photoId:'bad'},
    ]);
  });
  it('handles intact empty inventories',()=>{
    expect(comparePatientMediaInventory('A','patient-a',[],[])).toEqual([]);
  });
});
