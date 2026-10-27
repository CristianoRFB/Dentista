import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ClinicalPhoto } from '../../domain/types';
import { fetchClinicalPhoto, reviewClinicalPhoto, uploadClinicalPhoto } from './r2Client';
import { clinicalPhotoCatalog, searchPhotoTags } from './catalog';
import { listPatientRecords } from '../../lib/tenantData';
import { useTenantAccess } from '../tenant/TenantContext';

type PhotoAction = 'verify'|'reject'|'archive'|'restore';
const statusName:Record<string,string> = {unverified:'Aguardando revisão',verified:'Verificada',rejected:'Rejeitada'};
export function ClinicalPhotosPage(){
  const {tenantSlug='demo-clinica',patientId=''}=useParams();
  const session=useTenantAccess();
  const [q,setQ]=useState('');
  const [photos,setPhotos]=useState<ClinicalPhoto[]>([]);
  const [previews,setPreviews]=useState<Record<string,string>>({});
  const [files,setFiles]=useState<File[]>([]);
  const [showArchived,setShowArchived]=useState(false);
  const [editingId,setEditingId]=useState('');
  const [reason,setReason]=useState('');
  const [tags,setTags]=useState<string[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const availableTags=useMemo(()=>searchPhotoTags(q),[q]);
  const canWrite=session.status==='ready'&&!session.isDemo&&session.permissions.includes('clinical.write');
  const photoIds=useMemo(()=>photos.map(p=>p.id).sort().join('|'),[photos]);
  async function refresh(){
    if(session.isDemo){setPhotos([]);setLoading(false);return;}
    setLoading(true);
    try {
      const rows=await listPatientRecords<ClinicalPhoto>(session,patientId,'clinicalPhotos');
      setPhotos(rows.sort((a,b)=>b.capturedAt.localeCompare(a.capturedAt)));
      setError('');
    }catch {setError('Não foi possível carregar as mídias clínicas.');}
    finally{setLoading(false);}
  }
  useEffect(()=>{void refresh();},[session,patientId]);
  useEffect(()=>{
    let cancelled=false;
    const created:string[]=[];
    async function load(){
      if(session.status!=='ready'||session.isDemo||!session.permissions.includes('clinical.read')){
        setPreviews({});return;
      }
      const values=await Promise.all(photos.map(async photo=>{
        try {
          const url=await fetchClinicalPhoto({tenantId:session.tenant.id,patientId,photoId:photo.id});
          created.push(url);
          return [photo.id,url] as const;
        }catch {return [photo.id,''] as const;}
      }));
      if(!cancelled)setPreviews(Object.fromEntries(values));
    }
    void load();
    return ()=>{cancelled=true;created.forEach(url=>URL.revokeObjectURL(url));};
  },[session,patientId,photoIds]);

  async function uploadSelected(){
    if(!files.length||session.status!=='ready'||!canWrite)return;
    setBusy(true);setError('');setMessage('');
    try{
      for(const file of files)await uploadClinicalPhoto({tenantId:session.tenant.id,patientId,file});
      setFiles([]);setMessage('Imagens enviadas ao armazenamento clínico privado. Aguardando revisão.');
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível enviar imagens.');}
    finally{setBusy(false);}
  }
  function onFiles(e:ChangeEvent<HTMLInputElement>){setFiles([...(e.target.files??[])]);setError('');setMessage('');}
  function startEdit(photo:ClinicalPhoto){
    setEditingId(photo.id);setReason('');setTags(photo.tags??[]);setError('');setMessage('');
  }
  async function review(photo:ClinicalPhoto,action:PhotoAction){
    if(session.status!=='ready'||!canWrite)return;
    setBusy(true);setError('');setMessage('');
    try{
      await reviewClinicalPhoto({tenantId:session.tenant.id,patientId,photoId:photo.id,action,reason,tags});
      setEditingId('');setReason('');await refresh();
      setMessage(action==='archive'?'Imagem arquivada sem apagar o arquivo.':action==='restore'
        ?'Imagem restaurada; o histórico foi preservado.':'Classificação e auditoria registradas.');
    }catch(e){setError(e instanceof Error?e.message:'Erro ao revisar.');}
    finally{setBusy(false);}
  }
  const visible=photos.filter(p=>showArchived||(p.lifecycleStatus??'active')!=='archived');
  if(!session.permissions.includes('clinical.read'))return <main className="state-page"><h1>Acesso clínico negado</h1>
    <p>Seu perfil não permite consultar mídia clínica.</p></main>;
  return <>
    <div className="page-head"><div><span className="eyebrow">Mídia clínica privada · auditoria</span><h1>Fotos clínicas</h1>
      <p className="muted">R2 privado, revisão de imagens e arquivamento sem exclusão do histórico.</p></div>
      <Link className="btn secondary" to={'/'+tenantSlug+'/app/pacientes/'+patientId+'/clinico'}>Prontuário</Link></div>
    {session.isDemo&&<p className="demo-banner">Demonstração · sem dados de pacientes reais ou operações de escrita.</p>}
    {(error||message)&&<p className={error?'form-error':'form-success'} role={error?'alert':'status'}>{error||message}</p>}
    {canWrite&&<section className="card data-form">
      <h2>Enviar imagens</h2><label>JPEG, PNG ou WebP · até 15 MB por arquivo
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onFiles}/></label>
      {files.length>0&&<p>{files.length} arquivo(s) selecionado(s)</p>}
      <button className="btn primary" type="button" disabled={busy||files.length===0} onClick={()=>void uploadSelected()}>
        {busy?'Enviando…':'Enviar ao R2 privado'}</button>
    </section>}
    <section className="card" style={{marginTop:16}}>
      <div className="card-title"><h2>Galeria clínica</h2>
        <label><input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)}/> Exibir arquivadas</label></div>
      <p className="muted">Arquivar oculta a imagem da galeria padrão, mas mantém o arquivo e o histórico clínico.</p>
      <div className="grid cols-2 media-layout">
        <section><label>Classificações disponíveis<input value={q} onChange={e=>setQ(e.target.value)} placeholder="fr, lat dir, ocl sup..." /></label>
          <ul>{availableTags.map(t=><li key={t.code}>{t.label}</li>)}</ul></section>
        <section><p>Metadata no Firestore. A leitura do arquivo exige autorização do Worker a cada solicitação.</p>
          <p>Imagens ativas: {photos.filter(p=>(p.lifecycleStatus??'active')==='active').length} · Arquivadas: {photos.filter(p=>p.lifecycleStatus==='archived').length}</p></section>
      </div>
    </section>
    <section className="media-gallery" aria-label="Fotos do prontuário">
      {loading?<p role="status">Carregando imagens…</p>:visible.length===0?<div className="card">
        <p>Nenhuma imagem clínica neste filtro.</p></div>:visible.map(photo=><article className="card media-card" key={photo.id}>
        {previews[photo.id]?<img src={previews[photo.id]} alt={'Imagem clínica '+(photo.originalName||photo.id)}/>:
          <div className="media-placeholder">Imagem privada indisponível nesta sessão.</div>}
        <b>{photo.originalName}</b>
        <small>{new Date(photo.capturedAt).toLocaleString('pt-BR')} · {photo.contentType}</small>
        <span className="status-pill">{statusName[photo.status]??photo.status}</span>
        {photo.lifecycleStatus==='archived'&&<span className="status-pill">Arquivada · histórico preservado</span>}
        {(photo.tags??[]).length>0&&<p className="muted">Tags: {photo.tags.join(', ')}</p>}
        {canWrite&&<button type="button" className="btn secondary" onClick={()=>startEdit(photo)}>Revisar / arquivar</button>}
        {canWrite&&editingId===photo.id&&<div className="data-form">
          <label>Motivo obrigatório (12–500 caracteres)
            <textarea required minLength={12} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}
              placeholder="Descreva o motivo técnico da alteração. Não inclua informações clínicas desnecessárias no log."/></label>
          <fieldset><legend>Classificação</legend>{clinicalPhotoCatalog.map(tag=><label key={tag.code}>
            <input type="checkbox" checked={tags.includes(tag.code)} onChange={e=>setTags(current=>e.target.checked?
              [...current,tag.code]:current.filter(t=>t!==tag.code))}/>{tag.label}</label>)}</fieldset>
          <div className="row-actions">
            {photo.lifecycleStatus==='archived'?<button className="btn primary" disabled={busy||reason.trim().length<12}
              type="button" onClick={()=>void review(photo,'restore')}>Restaurar imagem</button>:<>
              <button className="btn primary" disabled={busy||reason.trim().length<12} type="button" onClick={()=>void review(photo,'verify')}>Verificar</button>
              <button className="btn secondary" disabled={busy||reason.trim().length<12} type="button" onClick={()=>void review(photo,'reject')}>Rejeitar</button>
              <button className="btn secondary" disabled={busy||reason.trim().length<12} type="button" onClick={()=>void review(photo,'archive')}>Arquivar sem excluir</button>
            </>}
            <button className="btn secondary" type="button" onClick={()=>setEditingId('')}>Cancelar</button>
          </div>
        </div>}
      </article>)}
    </section>
  </>;
}
