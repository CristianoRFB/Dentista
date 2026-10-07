import { describe, expect, it } from 'vitest';
import { canSchedule, findScheduleConflict, overlaps } from '../src/modules/scheduling/availability';

describe('agenda',()=>{
  it('detecta sobreposição',()=>expect(overlaps({start:10,end:20},{start:15,end:25})).toBe(true));
  it('aceita horário livre',()=>expect(canSchedule({start:30,end:40},[{start:10,end:20}])).toBe(true));
  it('bloqueia conflito simples',()=>expect(canSchedule({start:15,end:18},[{start:10,end:20}])).toBe(false));
  it('bloqueia o mesmo profissional',()=>expect(findScheduleConflict(
    {start:15,end:18,professionalId:'d1',resourceId:'c2'},
    [{start:10,end:20,professionalId:'d1',resourceId:'c1',status:'confirmed'}]
  )).toBe('professional'));
  it('bloqueia a mesma cadeira mesmo com outro dentista',()=>expect(findScheduleConflict(
    {start:15,end:18,professionalId:'d2',resourceId:'c1'},
    [{start:10,end:20,professionalId:'d1',resourceId:'c1',status:'confirmed'}]
  )).toBe('resource'));
  it('ignora appointment cancelado',()=>expect(findScheduleConflict(
    {start:15,end:18,professionalId:'d1',resourceId:'c1'},
    [{start:10,end:20,professionalId:'d1',resourceId:'c1',status:'cancelled'}]
  )).toBe(null));
});
