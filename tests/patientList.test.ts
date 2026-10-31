import { describe,expect,it } from 'vitest';
import { filterPatients,pagePatients,PATIENTS_PER_PAGE } from '../src/lib/patientList';
import type { Patient } from '../src/domain/types';
const base={tenantId:'A',status:'active',name:'Álvaro Ferreira',phone:'(17) 99999-8888',email:'alvaro@example.test'} as Patient;
const patients:Patient[]=[
  {...base,id:'1'}, {...base,id:'2',name:'Bruna',phone:'11999887766',email:'bruna@example.test',status:'inactive'},
  {...base,id:'3',name:'Carlos',phone:'5517998765432',email:'carlos@example.test'},
];
describe('D6 busca e paginação clínica',()=>{
  it('busca sem acentos em nome, telefone e e-mail',()=>{
    expect(filterPatients(patients,'alvaro','all').map(p=>p.id)).toEqual(['1']);
    expect(filterPatients(patients,'1199988','all').map(p=>p.id)).toEqual(['2']);
    expect(filterPatients(patients,'CARLOS@EXAMPLE.TEST','all').map(p=>p.id)).toEqual(['3']);
  });
  it('mantém pacientes inativos fora da lista padrão, mas localizáveis',()=>{
    expect(filterPatients(patients,'','active')).toHaveLength(2);
    expect(filterPatients(patients,'','inactive').map(p=>p.id)).toEqual(['2']);
  });
  it('pagina sem repetir ou descartar registros nas bordas',()=>{
    const many=Array.from({length:PATIENTS_PER_PAGE*2+1},(_,i)=>({...base,id:String(i)}));
    const a=pagePatients(many,1),b=pagePatients(many,2),c=pagePatients(many,3);
    expect([a.rows.length,b.rows.length,c.rows.length]).toEqual([12,12,1]);
    expect(new Set([...a.rows,...b.rows,...c.rows].map(x=>x.id)).size).toBe(many.length);
    expect(pagePatients(many,999).page).toBe(3);
    expect(()=>pagePatients(many,0)).toThrow();
  });
});
