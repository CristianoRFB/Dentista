import {describe,expect,it} from 'vitest';
import {agendaDayWindow,adjacentAgendaDay,localDateString,appointmentsStartingOnDay} from '../src/lib/agendaDate';
describe('D6 agenda calendar',()=>{
  it('selects real local day without leaking adjacent appointments',()=>{
    const {start,end}=agendaDayWindow('2026-10-29');
    expect(localDateString(start)).toBe('2026-10-29');
    expect(localDateString(end)).toBe('2026-10-30');
    expect(start.getTime()).toBeLessThan(end.getTime());
  });
  it('filters read-only appointments at the exact same half-open boundaries as the hosted query',()=>{
    const {start,end}=agendaDayWindow('2026-10-29');
    const rows=[{id:'before',startsAt:new Date(start.getTime()-1).toISOString()},
      {id:'first',startsAt:start.toISOString()},{id:'last',startsAt:new Date(end.getTime()-1).toISOString()},
      {id:'after',startsAt:end.toISOString()},{id:'invalid',startsAt:'invalid'}];
    expect(appointmentsStartingOnDay(rows,'2026-10-29').map(row=>row.id)).toEqual(['first','last']);
    expect(appointmentsStartingOnDay(rows,'2026-10-30').map(row=>row.id)).toEqual(['after']);
    expect(rows).toHaveLength(5);
  });
  it('advances month/year boundaries and rejects impossible dates',()=>{
    expect(adjacentAgendaDay('2026-12-31',1)).toBe('2027-01-01');
    expect(adjacentAgendaDay('2026-03-01',-1)).toBe('2026-02-28');
    expect(()=>agendaDayWindow('2026-02-30')).toThrow();
    expect(()=>agendaDayWindow('../../A')).toThrow();
  });
});
