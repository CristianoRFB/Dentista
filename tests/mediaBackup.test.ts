import {describe,it,expect} from 'vitest';
import {backupKeyFor,sha256Hex,validateBackupInput} from '../workers/media-api/src/mediaBackup';

const good={tenantId:'A',patientId:'p1',photoId:'photo_1',
  reason:'Solicitação de recuperação autorizada'};
describe('D5 — validação de backup privado',()=>{
  it('exige escopo, motivo explícito e SHA256 estrito para recuperação',()=>{
    expect(validateBackupInput(good)).toEqual(good);
    expect(()=>validateBackupInput({...good,tenantId:'../B'})).toThrow();
    expect(()=>validateBackupInput({...good,reason:'curto'})).toThrow();
    expect(()=>validateBackupInput({...good,digest:'a'.repeat(64)})).toThrow();
    expect(()=>validateBackupInput({...good,digest:'not-valid'},true)).toThrow();
    expect(validateBackupInput({...good,digest:'a'.repeat(64)},true).digest).toBe('a'.repeat(64));
  });
  it('gera chave somente com escopo e digest validado e calcula digest de bytes',async()=>{
    const digest=await sha256Hex(new TextEncoder().encode('abc').buffer);
    expect(digest).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(backupKeyFor(good,digest)).toBe('snapshots/tenants/A/patients/p1/photos/photo_1/sha256-'+digest);
    expect(()=>backupKeyFor(good,'../B')).toThrow();
  });
});
