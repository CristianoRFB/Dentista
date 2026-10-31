import {describe,it,expect} from 'vitest';
import {backupKeyFor,boundedImageBytes,MAX_BACKUP_PHOTO_BYTES,sha256Hex,validateBackupInput} from '../workers/media-api/src/mediaBackup';

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


describe('D5 — bounded streaming verification of R2 originals',()=>{
  it('rejects declared oversized data before reading a single chunk',async()=>{
    let reads=0;
    const body=new ReadableStream<Uint8Array>({pull(controller){reads++;controller.enqueue(new Uint8Array([1]));controller.close();}});
    await expect(boundedImageBytes({body,size:MAX_BACKUP_PHOTO_BYTES+1})).rejects.toThrow(/size/);
    expect(reads).toBe(0);
  });
  it('cancels untrusted streams as soon as a limit is breached',async()=>{
    let cancelled=false;
    const body=new ReadableStream<Uint8Array>({
      start(controller){controller.enqueue(new Uint8Array(MAX_BACKUP_PHOTO_BYTES));controller.enqueue(new Uint8Array([1]));},
      cancel(){cancelled=true;},
    });
    await expect(boundedImageBytes({body})).rejects.toThrow(/size/);
    expect(cancelled).toBe(true);
  });
  it('checks the actual byte count even when R2 declares a smaller size',async()=>{
    const body=new Blob([new Uint8Array([1,2,3])]).stream();
    await expect(boundedImageBytes({body,size:2})).rejects.toThrow(/size/);
  });
  it('copies chunk content and returns exact bytes after successful completion',async()=>{
    const bytes=new Uint8Array([1,2,3,4]);
    const body=new ReadableStream<Uint8Array>({start(c){
      c.enqueue(bytes.subarray(0,2));c.enqueue(bytes.subarray(2,4));c.close();
    }});
    const output=await boundedImageBytes({body,size:4});
    expect(new Uint8Array(output)).toEqual(bytes);
  });
  it('rejects zero-byte objects rather than backing up empty files',async()=>{
    await expect(boundedImageBytes({body:new Blob([]).stream(),size:0})).rejects.toThrow(/size/);
  });
});
