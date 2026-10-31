import {describe,it,expect,vi} from 'vitest';
import {validateOpenBookingRequest,trustedClientIp,verifyOpenBookingTurnstile} from '../workers/media-api/src/openBookingRequest';
const now=Date.parse('2026-10-31T12:00:00.000Z');
const input={tenantSlug:'clinica-a',name:'Paciente Exemplo',phone:'11988887777',
  email:'paciente@example.test',preferredAt:'2026-11-01T14:00:00.000Z',turnstileToken:'a'.repeat(50),contactAcknowledged:true};
describe('D4 — pedido público sem reserva de horário',()=>{
  it('normaliza contato e valida janela UTC',()=>{
    expect(validateOpenBookingRequest({...input,name:' Ana Maria ',email:'ANA@EXAMPLE.TEST'},now))
      .toMatchObject({name:'Ana Maria',email:'ana@example.test'});
  });
  it.each([
    {...input,tenantSlug:'../tenant-b'},
    {...input,name:'X'},
    {...input,phone:'1234'},
    {...input,email:'wrong'},
    {...input,preferredAt:'2026-01-01T00:00:00.000Z'},
    {...input,preferredAt:'2026-11-32T14:00:00.000Z'},
    {...input,turnstileToken:'tiny'},
    {...input,contactAcknowledged:false},
    {...input,clinicalNote:'dados sensíveis'},
  ])('rejeita formulário inválido e campos clínicos adicionais',payload=>{
    expect(()=>validateOpenBookingRequest(payload,now)).toThrow();
  });
  it('confia apenas no cabeçalho de IP de borda e falha fechado quando ausente',()=>{
    const req=new Request('https://worker.test',{headers:{'CF-Connecting-IP':'203.0.113.51'}});
    expect(trustedClientIp(req)).toBe('203.0.113.51');
    expect(()=>trustedClientIp(new Request('https://worker.test'))).toThrow();
  });
  it('exige hostname e action exatos no Turnstile; falha fechado para resposta inválida',async()=>{
    const check=vi.fn<typeof fetch>(async()=>Response.json({success:true,hostname:'app.test',action:'open_booking_request'}));
    expect(await verifyOpenBookingTurnstile(input.turnstileToken,'test-secret','203.0.113.51',['https://app.test'],check)).toBe(true);
    for(const verdict of [
      {success:true,hostname:'evil.test',action:'open_booking_request'},
      {success:true,hostname:'app.test',action:'login'},
      {success:false,hostname:'app.test',action:'open_booking_request'},
    ]){
      expect(await verifyOpenBookingTurnstile(input.turnstileToken,'test-secret','203.0.113.51',
        ['https://app.test'],async()=>Response.json(verdict))).toBe(false);
    }
    expect(await verifyOpenBookingTurnstile(input.turnstileToken,'','203.0.113.51',['https://app.test'],check)).toBe(false);
  });
});
