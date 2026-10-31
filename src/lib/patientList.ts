import type { Patient } from '../domain/types';

export type PatientStateFilter = 'all'|'active'|'inactive';
export const PATIENTS_PER_PAGE=12;
function normalize(value:string){
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
}
export function filterPatients(patients:readonly Patient[],query:string,state:PatientStateFilter):Patient[]{
  const needle=normalize(query);
  return patients.filter(patient=>(state==='all'||patient.status===state)
    && (!needle || [patient.name,patient.phone,patient.email]
      .some(value=>normalize(String(value??'')).includes(needle))))
    .sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}
export function pagePatients(patients:readonly Patient[],page:number,pageSize=PATIENTS_PER_PAGE){
  if(!Number.isInteger(page)||page<1||!Number.isInteger(pageSize)||pageSize<1)throw new Error('Invalid pagination');
  const pages=Math.max(1,Math.ceil(patients.length/pageSize));
  const effective=Math.min(page,pages);
  return {rows:patients.slice((effective-1)*pageSize,effective*pageSize),page:effective,pages,total:patients.length};
}
