import {describe,expect,it} from 'vitest';
import {appointmentStatusLabel} from '../src/lib/appointmentStatus';
import type {AppointmentStatus} from '../src/domain/types';
describe('appointment labels pt-BR',()=>{
  it('localizes all seven domain states without exposing technical codes',()=>{
    const statuses:AppointmentStatus[]=['pending','confirmed','checked_in','in_service','completed','cancelled','no_show'];
    expect(statuses.map(appointmentStatusLabel)).toEqual(['Pendente','Confirmado','Chegou','Em atendimento','Concluído','Cancelado','Não compareceu']);
  });
});
