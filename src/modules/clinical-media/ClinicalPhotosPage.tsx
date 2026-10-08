import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ClinicalPhoto } from '../../domain/types';
import { fetchClinicalPhoto, uploadClinicalPhoto } from './r2Client';
import { searchPhotoTags } from './catalog';
import { listPatientRecords } from '../../lib/tenantData';
import { useTenantAccess } from '../tenant/TenantContext';

interface PhotoView extends ClinicalPhoto { previewUrl?: string; }

export function ClinicalPhotosPage() {
  const { tenantSlug = 'demo-clinica', patientId = '' } = useParams();
  const session = useTenantAccess();
  const [q, setQ] = useState('');
  const [photos, setPhotos] = useState<PhotoView[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const tags = useMemo(() => searchPhotoTags(q), [q]);

  async function refresh() {
    if (session.isDemo) { setPhotos([]); setLoading(false); return; }
    setLoading(true);
    try {
      const rows = await listPatientRecords<ClinicalPhoto>(session, patientId, 'clinicalPhotos');
      setPhotos(rows.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)));
      setError('');
    } catch {
      setError('Não foi possível carregar as mídias clínicas.');
    } finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, [session, patientId]);

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];
    async function loadPreviews() {
      if (session.status !== 'ready' || session.isDemo || !session.permissions.includes('clinical.read')) return;
      const withPreviews = await Promise.all(photos.map(async photo => {
        try {
          const previewUrl = await fetchClinicalPhoto({ tenantId: session.tenant.id, patientId, photoId: photo.id });
          objectUrls.push(previewUrl);
          return { ...photo, previewUrl };
        } catch { return photo; }
      }));
      if (!cancelled) setPhotos(withPreviews);
    }
    void loadPreviews();
    return () => {
      cancelled = true;
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [session, patientId, photos.length]);

  async function uploadSelected() {
    if (!files.length || session.status !== 'ready') return;
    setUploading(true); setError(''); setMessage('');
    try {
      for (const file of files) await uploadClinicalPhoto({ tenantId: session.tenant.id, patientId, file });
      setFiles([]); setMessage(files.length + ' imagem(ns) enviada(s) para o armazenamento privado.');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível enviar as imagens.');
    } finally { setUploading(false); }
  }

  function onFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = [...(event.target.files ?? [])];
    setFiles(selected); setError(''); setMessage('');
  }

  if (!session.permissions.includes('clinical.read')) return <main className="state-page"><h1>Acesso clínico negado</h1><p>Seu perfil não permite consultar mídia clínica.</p></main>;
  return <>
    <div className="page-head"><div><span className="eyebrow">Mídia clínica privada</span><h1>Fotos clínicas</h1><p className="muted">Os arquivos são servidos pelo Worker somente após nova autorização. Não há URL pública permanente.</p></div><Link className="btn secondary" to={'/' + tenantSlug + '/app/pacientes/' + patientId + '/clinico'}>Voltar ao prontuário</Link></div>
    {session.isDemo && <p className="demo-banner">Modo demonstrativo · nenhuma imagem clínica fictícia.</p>}
    {(error || message) && <p className={error ? 'form-error' : 'form-success'} role={error ? 'alert' : 'status'}>{error || message}</p>}
    {session.permissions.includes('clinical.write') && !session.isDemo && <section className="card data-form">
      <h2>Enviar imagens</h2><label>JPEG, PNG ou WebP · até 15 MB por arquivo<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onFiles} /></label>
      {files.length > 0 && <p className="muted">{files.length} arquivo(s) selecionado(s)</p>}
      <button className="btn primary" type="button" disabled={uploading || files.length === 0} onClick={() => void uploadSelected()}>{uploading ? 'Enviando…' : 'Enviar com autorização clínica'}</button>
    </section>}
    <div className="grid cols-2 media-layout">
      <section className="card"><h2>Classificação</h2><input value={q} onChange={event => setQ(event.target.value)} placeholder="fr, lat dir, ocl sup..." aria-label="Buscar tags de classificação" /><ul>{tags.map(tag => <li key={tag.code}>{tag.label}</li>)}</ul></section>
      <section className="card"><h2>Armazenamento e autorização</h2><p>R2 privado · metadata no Firestore · acesso autenticado pelo Worker.</p><p>Status inicial: <span className="badge">unverified</span></p></section>
    </div>
    <section className="media-gallery" aria-label="Fotos do prontuário">{loading ? <p role="status">Carregando imagens…</p> : photos.length === 0 ? <div className="card"><p>Nenhuma imagem clínica neste prontuário.</p></div> : photos.map(photo => <article className="card media-card" key={photo.id}>
      {photo.previewUrl ? <img src={photo.previewUrl} alt={'Foto clínica ' + (photo.originalName || photo.id)} /> : <div className="media-placeholder">Imagem privada indisponível nesta sessão</div>}
      <b>{photo.originalName}</b><small>{new Date(photo.capturedAt).toLocaleString('pt-BR')} · {photo.contentType}</small><span className="status-pill">{photo.status}</span>
    </article>)}</section>
  </>;
}
