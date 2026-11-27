import type { ClinicalPhoto } from '../../domain/types';

export interface PhotoTag { code: string; label: string; aliases: string[]; }
export const clinicalPhotoCatalog: PhotoTag[] = [
  { code:'frontal', label:'Frontal', aliases:['fr','frontal'] },
  { code:'lateral-right', label:'Lateral direita', aliases:['lat dir','lateral direita','direita'] },
  { code:'lateral-left', label:'Lateral esquerda', aliases:['lat esq','lateral esquerda','esquerda'] },
  { code:'occlusal-upper', label:'Oclusal superior', aliases:['ocl sup','oclusal superior','superior'] },
  { code:'occlusal-lower', label:'Oclusal inferior', aliases:['ocl inf','oclusal inferior','inferior'] },
  { code:'smile', label:'Sorriso', aliases:['sorriso','smile'] },
  { code:'intraoral', label:'Intraoral', aliases:['intra','intraoral'] },
];
const norm=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function searchPhotoTags(query:string){
  const q=norm(query); if(!q) return clinicalPhotoCatalog;
  return clinicalPhotoCatalog.filter(x=>[x.code,x.label,...x.aliases].some(v=>norm(v).includes(q)));
}

export type PhotoVisibility = 'active'|'archived'|'all';
/** Shared presentation-only selection for gallery, previews and batch backup. */
export function filterClinicalPhotos<T extends Pick<ClinicalPhoto,'originalName'|'tags'|'lifecycleStatus'>>(photos:readonly T[],query:string,visibility:PhotoVisibility):T[]{
  const needle=norm(query);
  const matchingCodes=new Set(needle?searchPhotoTags(needle).map(tag=>tag.code):[]);
  return photos.filter(photo=>{
    const archived=photo.lifecycleStatus==='archived';
    if(visibility!=='all'&&(visibility==='archived')!==archived)return false;
    if(!needle)return true;
    return norm(photo.originalName??'').includes(needle)||(photo.tags??[]).some(tag=>norm(tag).includes(needle)||matchingCodes.has(norm(tag)));
  });
}
