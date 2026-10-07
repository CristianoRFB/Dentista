import { describe, expect, it } from 'vitest';
import { searchPhotoTags } from '../src/modules/clinical-media/catalog';
describe('catálogo de fotos',()=>{
  it('encontra frontal por fr',()=>expect(searchPhotoTags('fr').some(x=>x.code==='frontal')).toBe(true));
  it('encontra lateral direita por alias',()=>expect(searchPhotoTags('lat dir')[0]?.code).toBe('lateral-right'));
  it('encontra oclusal superior por alias',()=>expect(searchPhotoTags('ocl sup')[0]?.code).toBe('occlusal-upper'));
});
