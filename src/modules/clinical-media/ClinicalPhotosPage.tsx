import { useMemo, useState } from 'react';
import { searchPhotoTags } from './catalog';
export function ClinicalPhotosPage(){
  const [q,setQ]=useState(''); const tags=useMemo(()=>searchPhotoTags(q),[q]);
  return <><h1>Fotos clínicas</h1><p className="muted">Upload em lote, estado não verificado, classificação, timeline e comparação são parte do domínio.</p>
  <div className="grid cols-2"><div className="card"><h2>Classificação</h2><input value={q} onChange={e=>setQ(e.target.value)} placeholder="fr, lat dir, ocl sup..." />
  <ul>{tags.map(t=><li key={t.code}>{t.label}</li>)}</ul></div><div className="card"><h2>Armazenamento</h2><p>R2 privado como cópia remota + IndexedDB como cache local.</p><p>Status inicial sugerido: <span className="badge">unverified</span></p></div></div></>;
}
