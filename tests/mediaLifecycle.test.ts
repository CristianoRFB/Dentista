import { describe, expect, it } from 'vitest';
import { photoTransition, validatePhotoReview } from '../workers/media-api/src/mediaLifecycle';

const valid = {
  tenantId:'A', patientId:'patient-a',action:'verify',
  reason:'Imagem validada por profissional responsável',tags:['frontal','smile'],
};

describe('D5 — ciclo de vida da mídia clínica',()=>{
  it('valida entradas, classificação permitida e motivo de auditoria',()=>{
    expect(validatePhotoReview(valid)).toMatchObject(valid);
    expect(()=>validatePhotoReview({...valid,tenantId:'../B'})).toThrow();
    expect(()=>validatePhotoReview({...valid,action:'erase'})).toThrow();
    expect(()=>validatePhotoReview({...valid,reason:'curto'})).toThrow();
    expect(()=>validatePhotoReview({...valid,tags:['smile','smile']})).toThrow();
    expect(()=>validatePhotoReview({...valid,tags:['other-unknown']})).toThrow();
  });
  it('arquiva sem deletar e permite restauração sem perder o status clínico',()=>{
    const marked=photoTransition({status:'verified',lifecycleStatus:'active'},'archive');
    expect(marked).toEqual({status:'verified',lifecycleStatus:'archived'});
    expect(photoTransition(marked,'restore')).toEqual({status:'verified',lifecycleStatus:'active'});
    expect(()=>photoTransition(marked,'verify')).toThrow();
    expect(()=>photoTransition(marked,'archive')).toThrow();
    expect(()=>photoTransition({status:'unverified',lifecycleStatus:'active'},'restore')).toThrow();
  });
  it('rejeição não equivale à exclusão do objeto clínico',()=>{
    expect(photoTransition({status:'unverified'},'reject')).toEqual({status:'rejected',lifecycleStatus:'active'});
    expect(()=>photoTransition({status:'rejected'},'reject')).toThrow();
  });
});
