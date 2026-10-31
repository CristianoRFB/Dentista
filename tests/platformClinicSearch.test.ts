import {describe,it,expect} from 'vitest';
import {demoTenants} from '../src/sample/demoData';
import {filterClinicRows} from '../src/modules/platform/clinicSearch';
describe('UX plataforma — filtro somente visual de clínicas',()=>{
  it('busca nome sem acento e sem distinção de caixa',()=>{
    expect(filterClinicRows(demoTenants,' CLINICA aurora ').map(t=>t.slug)).toEqual(['demo-clinica']);
  });
  it('busca endereço público parcial',()=>{
    expect(filterClinicRows(demoTenants,'odonto-teste').map(t=>t.id)).toEqual(['tenant_test_b']);
  });
  it('não altera a coleção nem cria efeitos colaterais',()=>{
    const original=JSON.stringify(demoTenants);
    expect(filterClinicRows(demoTenants,'')).toHaveLength(demoTenants.length);
    expect(filterClinicRows(demoTenants,'inexistente')).toHaveLength(0);
    expect(JSON.stringify(demoTenants)).toBe(original);
  });
});
