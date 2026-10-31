import {describe,expect,it} from 'vitest';
import {summarizeMediaUsagePage,MEDIA_USAGE_PAGE_SIZE} from '../workers/media-api/src/mediaUsage';

describe('D5 — agregação segura de páginas de bytes',()=>{
  it('soma bytes válidos sem fornecer nomes/keys a quem consulta',()=>{
    expect(summarizeMediaUsagePage([
      {key:'tenants/A/patients/p1/a.jpg',size:2},
      {key:'tenants/A/patients/p2/b.jpg',size:18},
    ],'A')).toEqual({objectCount:2,bytes:20});
  });
  it('rejeita keys de outro tenant, tamanhos negativos ou inválidos, e excesso de página',()=>{
    for(const item of [
      {key:'tenants/B/patients/p1/secret.jpg',size:10},
      {key:'tenants/A/patients/p1/a.jpg',size:-1},
      {key:'tenants/A/patients/p1/a.jpg',size:NaN},
      {key:'tenants/A/patients/p1/a.jpg',size:1.3},
    ]) expect(()=>summarizeMediaUsagePage([item],'A')).toThrow();
    expect(()=>summarizeMediaUsagePage(Array.from({length:MEDIA_USAGE_PAGE_SIZE+1},(_,i)=>({
      key:'tenants/A/patients/p1/'+i,size:1,
    })),'A')).toThrow();
  });
});
