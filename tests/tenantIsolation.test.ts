import { describe, expect, it } from 'vitest';
const belongsTo=(resource:{tenantId:string},tenantId:string)=>resource.tenantId===tenantId;
describe('isolamento lógico básico',()=>{
  it('não confunde tenant A e B',()=>{expect(belongsTo({tenantId:'A'},'A')).toBe(true);expect(belongsTo({tenantId:'A'},'B')).toBe(false);});
});
