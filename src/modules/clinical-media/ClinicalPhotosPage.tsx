import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ClinicalPhoto } from '../../domain/types';
import { fetchClinicalPhoto, reviewClinicalPhoto, uploadClinicalPhoto } from './r2Client';
import { searchPhotoTags } from './catalog';
import { listPatientRecords } from '../../lib/tenantData';
import { useTenantAccess } from '../tenant/TenantContext';

const REVIEW_TAGS = [
  ['frontal','Frontal'],['lateral-right','Lateral direita'],['lateral-left','Lateral esquerda'],
  ['occlusal-upper','Oclusal superior'],['occlusal-lower','Oclusal inferior'],['smile','Sorriso'],
  ['intraoral','Intraoral'],
] as const;
type PhotoAction = 'verify' | 'reject' | 'archive' | 'restore';
const ACTIONS: {action:PhotoAction;label:string}[] = [
  {action:'verify',label:'Verificar'}, {action:'reject',label:'Rejeitar'},
  {action:'archive',label:'Arquivar sem excluir'}, {action:'restore',label:'Restaurar'},
];

export function ClinicalPhotosPage() {
  const { tenantSlug = 'demo-clinica', patientId = '' } = useParams();
  const session = useTenantAccess();
  const [q, setQ] = useState('');
  const [photos, setPhotos] = useState<ClinicalPhoto[]>([]);
  const [previews,setPreviews] = useState<Record<string,string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [visibility,setVisibility] = useState<'active'|'archived'|'all'>('active');
  const [reviewId,setReviewId] = useState('');
  const [reason,setReason] = useState('');
  const [selectedTags,setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const tags = useMemo(() => searchPhotoTags(q), [q]);

  async function refresh() {
    if(session.status !== 'ready') return;
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

  // Keep browser object URLs out of clinical metadata, and release them on every refresh/unmount.
  useEffect(() => {
    if (session.status !== 'ready' || session.isDemo || !session.permissions.includes('clinical.read')) return;
    let disposed = false;
    const urls: string[] = [];
    const pending = photos.filter(photo => visibility === 'all' ||
      (visibility === 'archived' ? photo.lifecycleStatus === 'archived' : photo.lifecycleStatus !== 'archived'));
    setPreviews({});
    void Promise.all(pending.map(async photo => {
      try {
        const url=await fetchClinicalPhoto({ tenantId:session.tenant.id, patientId, photoId:photo.id });
        urls.push(url);
        if(!disposed) setPreviews(previous=>({...previous,[photo.id]:url}));
      } catch { /* metadata remains available even when R2 cannot be read */ }
    }));
    return () => {
      disposed=true;
      urls.forEach(url=>URL.revokeObjectURL(url));
    };
  }, [session, patientId, photos, visibility]);

  async function uploadSelected() {
    if (!files.length || session.status !== 'ready' || session.isDemo) return;
    setBusy(true);setError('');setMessage('');
    try {
      for (const file of files) await uploadClinicalPhoto({ tenantId:session.tenant.id, patientId, file });
      setFiles([]);setMessage(files.length+' imagem(ns) enviada(s) ao R2 privado.');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível enviar as imagens.');
    } finally {setBusy(false);}
  }
  function onFiles(event:ChangeEvent<HTMLInputElement>) {
    setFiles([...(event.target.files ?? [])]);setError('');setMessage('');
  }
  async function perform(action:PhotoAction) {
    if (session.status !== 'ready' || session.isDemo || !reviewId) return;
    if(reason.trim().length<12) {setError('Descreva o motivo da ação em pelo menos 12 caracteres.');return;}
    setBusy(true);setError('');setMessage('');
    try {
      await reviewClinicalPhoto({
        tenantId:session.tenant.id,patientId,photoId:reviewId,action,reason:reason.trim(),tags:selectedTags,
      });
      setReviewId('');setReason('');setSelectedTags([]);
      await refresh();setMessage('Alteração auditada. O arquivo clínico original continua preservado.');
    } catch(e) {setError(e instanceof Error?e.message:'Falha ao revisar imagem clínica.');}
    finally {setBusy(false);}
  }
  const writable = session.status === 'ready' && !session.isDemo && session.permissions.includes('clinical.write');
  const displayed=photos.filter(photo=>visibility==='all' ||
    (visibility==='archived'?photo.lifecycleStatus==='archived':photo.lifecycleStatus!=='archived'));
  const selected=photos.find(photo=>photo.id===reviewId);

  if(session.status !== 'ready' || !session.permissions.includes('clinical.read')) {
    return <main className="state-page"><h1>Acesso clínico negado</h1><p>Seu perfil não permite consultar mídia clínica.</p></main>;
  }
  return <>
    <div className="page-head"><div><span className="eyebrow">Mídia clínica privada</span><h1>Fotos clínicas</h1>
      <p className="muted">O Worker verifica cada acesso. Arquivar é reversível e nunca exclui a imagem do R2.</p></div>
      <Link className="btn secondary" to={'/'+tenantSlug+'/app/pacientes/'+patientId+'/clinico'}>Voltar ao prontuário</Link></div>
    {session.isDemo && <p className="demo-banner">Modo demonstrativo · nenhuma foto clínica real ou simulada armazenada.</p>}
    {(error||message)&&<p className={error?'form-error':'form-success'} role={error?'alert':'status'}>{error||message}</p>}
    {writable && <section className="card data-form">
      <h2>Enviar imagens</h2><label>JPEG, PNG ou WebP · até 15 MB por arquivo
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onFiles}/></label>
      {files.length>0&&<p className="muted">{files.length} arquivo(s) selecionado(s)</p>}
      <button className="btn primary" type="button" disabled={busy||files.length===0} onClick={()=>void uploadSelected()}>
        {busy?'Enviando…':'Enviar com autorização clínica'}</button>
    </section>}
    <div className="grid cols-2 media-layout">
      <section className="card"><h2>Referência de classificação</h2><input value={q} onChange={event=>setQ(event.target.value)}
        placeholder="fr, lat dir, ocl sup..." aria-label="Buscar tags de classificação"/>
        <ul>{tags.map(tag=><li key={tag.code}>{tag.label}</li>)}</ul>
      </section>
      <section className="card"><h2>Integridade e privacidade</h2>
        <p>Armazenamento privado R2. Metadados e auditoria no Firestore. Sem link público permanente.</p>
        <p>Verificação, rejeição e arquivamento são ações auditadas, não exclusões clínicas.</p>
      </section>
    </div>
    <div className="card agenda-toolbar">
      <label>Exibição<select value={visibility} onChange={e=>setVisibility(e.target.value as typeof visibility)}>
        <option value="active">Ativas</option><option value="archived">Arquivadas</option><option value="all">Todas</option>
      </select></label>
      <span className="muted">{displayed.length} imagens nesta seleção</span>
    </div>
    <section className="media-gallery" aria-label="Fotos do prontuário">
      {loading?<p role="status">Carregando imagens…</p>:displayed.length===0?<div className="card">
        <p>Nenhuma imagem clínica nesta seleção.</p></div>:displayed.map(photo=><article className="card media-card" key={photo.id}>
        {previews[photo.id]?<img src={previews[photo.id]} alt={'Foto clínica '+(photo.originalName||photo.id)}/>:
          <div className="media-placeholder">Imagem privada indisponível nesta sessão</div>}
        <b>{photo.originalName}</b>
        <small>{new Date(photo.capturedAt).toLocaleString('pt-BR')} · {photo.contentType}</small>
        <span className="status-pill">{photo.status}</span>
        {photo.lifecycleStatus==='archived'&&<span className="status-pill">Arquivada — arquivo preservado</span>}
        {photo.tags?.length>0&&<small>Tags: {photo.tags.join(', ')}</small>}
        {writable&&<button type="button" className="btn secondary" disabled={busy} onClick={()=>{
          setReviewId(photo.id);setReason('');setSelectedTags([...photo.tags??[]]);setError('');
        }}>Revisar imagem</button>}
      </article>)}
    </section>
    {writable&&selected&&<section className="card data-form" aria-label="Revisão de imagem" style={{marginTop:16}}>
      <h2>Revisão: {selected.originalName}</h2><p className="muted">O histórico e o arquivo original são preservados.</p>
      <label>Motivo administrativo da ação<textarea value={reason} maxLength={500} minLength={12}
        onChange={e=>setReason(e.target.value)} placeholder="Descreva a revisão sem copiar informações clínicas sensíveis para a auditoria." /></label>
      <fieldset><legend>Classificação visual</legend>
        <div className="grid cols-2">{REVIEW_TAGS.map(([code,label])=><label key={code}>
          <input type="checkbox" checked={selectedTags.includes(code)} onChange={e=>
            setSelectedTags(old=>e.target.checked?[...old,code]:old.filter(x=>x!==code))}/>{label}</label>)}
        </div></fieldset>
      <div className="row-actions">{ACTIONS.filter(item=>
        selected.lifecycleStatus==='archived'?item.action==='restore':item.action!=='restore')
        .map(item=><button key={item.action} type="button" className="btn secondary" disabled={busy||reason.trim().length<12}
          onClick={()=>void perform(item.action)}>{item.label}</button>)}
        <button type="button" className="btn secondary" onClick={()=>setReviewId('')}>Cancelar</button>
      </div>
    </section>}
  </>;
}
