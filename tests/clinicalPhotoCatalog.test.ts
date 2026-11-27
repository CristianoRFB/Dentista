import { describe, expect, it } from 'vitest';
import { filterClinicalPhotos, searchPhotoTags } from '../src/modules/clinical-media/catalog';
describe('catálogo de fotos',()=>{
  it('encontra frontal por fr',()=>expect(searchPhotoTags('fr').some(x=>x.code==='frontal')).toBe(true));
  it('encontra lateral direita por alias',()=>expect(searchPhotoTags('lat dir')[0]?.code).toBe('lateral-right'));
  it('encontra oclusal superior por alias',()=>expect(searchPhotoTags('ocl sup')[0]?.code).toBe('occlusal-upper'));
});

describe('seleção compartilhada da galeria clínica',()=>{
  const photos=[
    {id:'a',originalName:'Série clínica 01.webp',tags:['lateral-right'],lifecycleStatus:'active' as const},
    {id:'b',originalName:'Série clínica 02.webp',tags:['occlusal-upper'],lifecycleStatus:'archived' as const},
    {id:'c',originalName:'Sorriso.webp',tags:[]},
  ];
  const ids=(q:string,v:'active'|'archived'|'all')=>filterClinicalPhotos(photos,q,v).map(p=>p.id);
  it('matches catalog aliases and translated labels for stored codes',()=>{
    expect(ids('lat dir','active')).toEqual(['a']);
    expect(ids('LATERAL DIREITA','all')).toEqual(['a']);
    expect(ids('ocl sup','all')).toEqual(['b']);
    expect(ids('sorriso','active')).toEqual(['c']);
    expect(ids('serie clinica','all')).toEqual(['a','b']);
  });
  it('preserves visibility, ordering and originals, including legacy active records',()=>{
    expect(ids('ocl sup','active')).toEqual([]);
    expect(ids('ocl sup','archived')).toEqual(['b']);
    expect(ids('','active')).toEqual(['a','c']);
    expect(ids('','all')).toEqual(['a','b','c']);
    expect(ids('not-a-tag','all')).toEqual([]);
    expect(photos[0].tags).toEqual(['lateral-right']);
  });
});
