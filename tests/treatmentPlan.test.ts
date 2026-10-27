import {describe,it,expect} from 'vitest';
import { canTransitionTreatment, planVersionId, treatmentTotalCents, validateTreatmentVersion, type TreatmentItem } from '../src/domain/treatmentPlan';
const item:TreatmentItem={procedureId:'proc-a',description:'Avaliação clínica',toothId:'16',stage:'planned',quantity:2,unitPriceCents:4500};
describe('D2: plano de tratamento e orçamento',()=>{
  it('faz cálculo determinístico em centavos e não cria valor para plano clínico sem orçamento',()=>{
    expect(treatmentTotalCents([item],true)).toBe(9000);
    expect(treatmentTotalCents([{...item,unitPriceCents:0}],false)).toBe(null);
    expect(planVersionId(2)).toBe('v00002');
  });
  it('nega preço no Essencial clínico, dados inválidos e itens além do teto',()=>{
    expect(()=>validateTreatmentVersion({items:[item],note:'',quoteEnabled:false})).toThrow();
    expect(()=>validateTreatmentVersion({items:[{...item,toothId:'99'}],note:'',quoteEnabled:true})).toThrow();
    expect(()=>validateTreatmentVersion({items:[{...item,unitPriceCents:-1}],note:'',quoteEnabled:true})).toThrow();
    expect(()=>validateTreatmentVersion({items:Array(13).fill(item),note:'',quoteEnabled:true})).toThrow();
    expect(validateTreatmentVersion({items:[{...item,unitPriceCents:0}],note:'  revisar  ',quoteEnabled:false}).note).toBe('revisar');
  });
  it('impede transições indevidas depois de finalizar ou cancelar',()=>{
    expect(canTransitionTreatment('draft','approved')).toBe(true);
    expect(canTransitionTreatment('draft','completed')).toBe(false);
    expect(canTransitionTreatment('approved','in_progress')).toBe(true);
    expect(canTransitionTreatment('completed','draft')).toBe(false);
    expect(canTransitionTreatment('cancelled','draft')).toBe(false);
  });
});
