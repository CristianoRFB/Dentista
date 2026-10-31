import {describe,expect,it} from 'vitest';
import {demoTenants} from '../src/sample/demoData';
import {getWorkspaceNavigation,workspaceContext} from '../src/modules/tenant/workspaceNavigation';
const base='/demo-clinica/app';
const tenant=demoTenants[0];
describe('UX — navegação guiada pelas permissões, sem atalhos indevidos',()=>{
  it('sempre oferece início sem mostrar ações clínicas não autorizadas',()=>{
    const groups=getWorkspaceNavigation(base,tenant,[]);
    expect(groups.flatMap(g=>g.items.map(i=>i.id))).toEqual(['inicio']);
    expect(groups.find(g=>g.id==='atendimento')).toBeUndefined();
  });
  it('agrupa tarefas operacionais permitidas e evita expor convites sem manage',()=>{
    const groups=getWorkspaceNavigation(base,tenant,['patients.read','appointments.read']);
    const all=groups.flatMap(g=>g.items);
    expect(all.some(x=>x.id==='pacientes')).toBe(true);
    expect(all.some(x=>x.id==='agenda')).toBe(true);
    expect(all.some(x=>x.id==='convites')).toBe(false);
  });
  it('identifica o contexto de um prontuário sem expor nome de paciente',()=>{
    const groups=getWorkspaceNavigation(base,tenant,['patients.read','appointments.read']);
    const ctx=workspaceContext(base+'/pacientes/p1/clinico',groups,base);
    expect(ctx.label).toBe('Pacientes');
    expect(JSON.stringify(ctx)).not.toContain('p1');
  });
  it('mantém a ajuda localizável mesmo se o perfil só vê o início',()=>{
    expect(workspaceContext(base+'/ajuda',getWorkspaceNavigation(base,tenant,[]),base).label)
      .toBe('Ajuda e orientações');
  });
});
