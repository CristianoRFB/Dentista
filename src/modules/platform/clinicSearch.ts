import type {Tenant} from '../../domain/types';
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLocaleLowerCase('pt-BR').trim();
/** Read-only filtering of public clinic identity; no patient data is used. */
export function filterClinicRows(tenants:readonly Tenant[],term:string):Tenant[]{
  const query=normalize(term);
  if(!query)return [...tenants];
  return tenants.filter(t=>normalize(t.name+' '+t.slug+' '+(t.branding?.publicName??'')).includes(query));
}
