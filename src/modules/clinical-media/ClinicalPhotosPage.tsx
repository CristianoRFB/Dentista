import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ClinicalPhoto } from '../../domain/types';
import { createPatientBackupBatch, createPhotoBackup, fetchClinicalPhoto, inspectClinicalPhotoIntegrity, listPhotoBackups, verifyPhotoBackup, recoverMissingPhoto, reviewClinicalPhoto, uploadClinicalPhoto, type ClinicalBackupManifest, type MediaIntegrityReport } from './r2Client';
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
  const [visibleLimit,setVisibleLimit] = useState(8);
  const [integrity,setIntegrity] = useState<MediaIntegrityReport|null>(null);
  const [checkingIntegrity,setCheckingIntegrity] = useState(false);
  const [visibility,setVisibility] = useState<'active'|'archived'|'all'>('active');
  const [reviewId,setReviewId] = useState('');
  const [backupPhotoId,setBackupPhotoId]=useState('');
  const [backupReason,setBackupReason]=useState('');
  const [backupRecords,setBackupRecords]=useState<ClinicalBackupManifest[]>([]);
  const [backupNext,setBackupNext]=useState<string|null>(null);
  const [backupBusy,setBackupBusy]=useState(false);
  const [batchReason,setBatchReason]=useState('');
  const [batchBusy,setBatchBusy]=useState(false);
  const [batchOffset,setBatchOffset]=useState(0);
  const [batchReport,setBatchReport]=useState<import('./r2Client').BatchBackupReport|null>(null);
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
  useEffect(()=>{setBackupPhotoId('');setBackupRecords([]);setBackupNext(null);},[patientId]);
  useEffect(()=>{setBatchOffset(0);setBatchReport(null);},[q,visibility,patientId]);

  // Keep browser object URLs out of clinical metadata, and release them on every refresh/unmount.
  useEffect(() => {
    if (session.status !== 'ready' || session.isDemo || !session.permissions.includes('clinical.read')) return;
    let disposed = false;
    const urls: string[] = [];
    const pending = photos.filter(photo => (visibility === 'all' ||
      (visibility === 'archived' ? photo.lifecycleStatus === 'archived' : photo.lifecycleStatus !== 'archived'))
      && (!q.trim() || (photo.originalName+' '+(photo.tags??[]).join(' ')).toLowerCase().includes(q.trim().toLowerCase())))
      .slice(0,visibleLimit);
    setPreviews({});
    void Promise.all(pending.map(async photo => {
      try {
        const url=await fetchClinicalPhoto({ tenantId:session.tenant.id, patientId, photoId:photo.id });
        if (disposed) {
          URL.revokeObjectURL(url);
          return;
        }
        urls.push(url);
        setPreviews(previous=>({...previous,[photo.id]:url}));
      } catch { /* metadata remains available even when R2 cannot be read */ }
    }));
    return () => {
      disposed=true;
      urls.forEach(url=>URL.revokeObjectURL(url));
    };
  }, [session, patientId, photos, visibility, q, visibleLimit]);

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
  async function inspectIntegrity(){
    if(session.status!=='ready'||session.isDemo||!session.permissions.includes('clinical.write'))return;
    setCheckingIntegrity(true);setError('');setIntegrity(null);
    try{setIntegrity(await inspectClinicalPhotoIntegrity(session.tenant.id,patientId));}
    catch(e){setError(e instanceof Error?e.message:'Não foi possível verificar o inventário.');}
    finally{setCheckingIntegrity(false);}
  }

  async function openBackup(photoId:string,pageToken?:string){
    if(session.status!=='ready'||session.isDemo)return;
    setBackupBusy(true);setError('');
    try {
      const result=await listPhotoBackups({tenantId:session.tenant.id,patientId,photoId},pageToken);
      setBackupPhotoId(photoId);
      setBackupRecords(previous=>pageToken?[...previous,...result.records]:result.records);
      setBackupNext(result.nextPageToken);
    }catch(e){setError(e instanceof Error?e.message:'Falha no catálogo de backups.');}
    finally{setBackupBusy(false);}
  }
  async function createBackup(){
    if(session.status!=='ready'||!backupPhotoId)return;
    if(backupReason.trim().length<12){setError('Descreva o motivo em pelo menos 12 caracteres.');return;}
    setBackupBusy(true);setError('');setMessage('');
    try{
      const result=await createPhotoBackup({tenantId:session.tenant.id,patientId,photoId:backupPhotoId},backupReason.trim());
      setMessage((result.alreadyBackedUp?'Cópia existente verificada.':'Cópia criada e verificada.')+' SHA-256: '+result.digest);
      const latest=await listPhotoBackups({tenantId:session.tenant.id,patientId,photoId:backupPhotoId});
      setBackupRecords(latest.records);setBackupNext(latest.nextPageToken);
    }catch(e){setError(e instanceof Error?e.message:'Falha ao criar backup.');}
    finally{setBackupBusy(false);}
  }

  async function inspectBackup(digest:string){
    if(session.status!=='ready'||!backupPhotoId)return;
    if(backupReason.trim().length<12){setError('Informe um motivo de pelo menos 12 caracteres.');return;}
    setBackupBusy(true);setError('');setMessage('');
    try{
      const result=await verifyPhotoBackup({tenantId:session.tenant.id,patientId,photoId:backupPhotoId},
        digest,backupReason.trim());
      setMessage('SHA-256 do backup verificado ('+result.sizeBytes+' bytes). Original R2: '+
        (result.originalPresent?'presente':'ausente')+'. Nenhum arquivo foi alterado.');
    }catch(e){setError(e instanceof Error?e.message:'Cópia privada não verificada.');}
    finally{setBackupBusy(false);}
  }
  async function restoreBackup(digest:string){
    if(session.status!=='ready'||!backupPhotoId)return;
    if(backupReason.trim().length<12){setError('Descreva o motivo em pelo menos 12 caracteres.');return;}
    if(!window.confirm('Recuperar somente um arquivo R2 AUSENTE a partir do backup verificado? Esta operação é auditada.'))return;
    setBackupBusy(true);setError('');setMessage('');
    try{
      await recoverMissingPhoto({tenantId:session.tenant.id,patientId,photoId:backupPhotoId},digest,backupReason.trim());
      setMessage('Original ausente recuperado e verificado por SHA-256.');await refresh();
    }catch(e){setError(e instanceof Error?e.message:'Falha na recuperação.');}
    finally{setBackupBusy(false);}
  }


  async function backupVisibleBatch(){
    if(session.status!=='ready'||session.isDemo||session.membership?.role!=='dentist')return;
    const ids=displayed.slice(batchOffset,batchOffset+5).map(photo=>photo.id);
    if(!ids.length||batchReason.trim().length<12)return;
    if(!window.confirm('Criar ou verificar backups privados para '+ids.length+
      ' imagem(ns)? Nenhum original será apagado.'))return;
    setBatchBusy(true);setError('');setMessage('');setBatchReport(null);
    try{
      const report=await createPatientBackupBatch(session.tenant.id,patientId,ids,batchReason.trim());
      setBatchReport(report);
      if(report.failed)setError(report.failed+' imagem(ns) não tiveram backup verificado. Confira cada falha.');
      else setMessage(report.succeeded+' cópia(s) verificadas por SHA-256, com auditoria individual.');
    }catch(e){setError(e instanceof Error?e.message:'Falha no backup em lote.');}
    finally{setBatchBusy(false);}
  }

  const writable = session.status === 'ready' && !session.isDemo && session.permissions.includes('clinical.write');
  const backupAllowed=writable&&session.status==='ready'&&session.membership?.role==='dentist';
  const displayed=photos.filter(photo=>(visibility==='all' ||
    (visibility==='archived'?photo.lifecycleStatus==='archived':photo.lifecycleStatus!=='archived'))
    && (!q.trim() || (photo.originalName+' '+(photo.tags??[]).join(' ')).toLowerCase().includes(q.trim().toLowerCase())));
  const visiblePhotos=displayed.slice(0,visibleLimit);
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
        {writable&&<button type="button" className="btn secondary" disabled={checkingIntegrity||busy}
          onClick={()=>void inspectIntegrity()}>{checkingIntegrity?'Conferindo arquivos…':'Verificar integridade R2 × Firestore'}</button>}
        {integrity&&<div role="status">
          <p>Verificados: {integrity.checkedMetadata} metadados e {integrity.checkedObjects} objetos privados.</p>
          <p><strong>{integrity.findings.length} ocorrência(s) para revisão manual.</strong> Nenhum arquivo foi modificado.</p>
          <p className="muted">Comparação não atômica entre R2 e Firestore, limitada a {integrity.limit.toLocaleString('pt-BR')} registros por origem. Confirme cada divergência antes de qualquer intervenção.</p>
          {integrity.findings.length>0&&<ul>{integrity.findings.map((f,i)=><li key={i}>
            {f.kind==='missing_r2_object'?'Arquivo ausente do R2':f.kind==='unreferenced_r2_candidate'
              ?'Possível objeto sem referência':'Referência fora do escopo'}
            {f.photoId?' · ID '+f.photoId:''}
          </li>)}</ul>}
        </div>}
      </section>
    </div>

    {backupAllowed&&<section className="card data-form" aria-label="Backup de imagens em lote">
      <h2>Backup de até cinco imagens</h2>
      <p className="muted">Lote {Math.floor(batchOffset/5)+1}: imagens {displayed.length?batchOffset+1:0} a {Math.min(displayed.length,batchOffset+5)} de {displayed.length} da seleção atual. Nenhum original é excluído.</p>
      <div className="row-actions">
        <button type="button" className="btn secondary" disabled={batchBusy||batchOffset===0}
          onClick={()=>{setBatchOffset(old=>Math.max(0,old-5));setBatchReport(null);}}>Cinco anteriores</button>
        <button type="button" className="btn secondary" disabled={batchBusy||batchOffset+5>=displayed.length}
          onClick={()=>{setBatchOffset(old=>old+5);setBatchReport(null);}}>Próximas cinco</button>
      </div>
      <label>Motivo administrativo do lote<textarea value={batchReason} minLength={12} maxLength={500} rows={2}
        onChange={e=>setBatchReason(e.target.value)} placeholder="Justificativa sem dados de saúde"/></label>
      <button className="btn secondary" type="button" disabled={batchBusy||backupBusy||busy||batchOffset>=displayed.length||batchReason.trim().length<12}
        onClick={()=>void backupVisibleBatch()}>{batchBusy?'Verificando cópias…':'Criar/verificar este lote de até cinco fotos'}</button>
      {batchReport&&<div role="status">
        <p><strong>{batchReport.succeeded} verificada(s), {batchReport.failed} falha(s).</strong>
          {batchReport.complete?' Lote completo.':' Lote incompleto; confira as falhas.'}</p>
        <ul>{batchReport.items.map(item=><li key={item.photoId}>
          Foto {photos.find(photo=>photo.id===item.photoId)?.originalName??item.photoId}: {
            item.status==='verified'?'SHA-256 conferido':'Falhou — confira o original e tente novamente'}
        </li>)}</ul>
      </div>}
    </section>}
    <div className="card agenda-toolbar">
      <label>Exibição<select value={visibility} onChange={e=>setVisibility(e.target.value as typeof visibility)}>
        <option value="active">Ativas</option><option value="archived">Arquivadas</option><option value="all">Todas</option>
      </select></label>
      <span className="muted">{Math.min(displayed.length,visibleLimit)} de {displayed.length} imagens nesta seleção</span>
    </div>
    <section className="media-gallery" aria-label="Fotos do prontuário">
      {loading?<p role="status">Carregando imagens…</p>:displayed.length===0?<div className="card">
        <p>Nenhuma imagem clínica nesta seleção.</p></div>:visiblePhotos.map(photo=><article className="card media-card" key={photo.id}>
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
        {backupAllowed&&<button type="button" className="btn secondary" disabled={backupBusy}
          onClick={()=>{setBackupReason('');setBackupRecords([]);setBackupNext(null);void openBackup(photo.id);}}>
          Backups privados</button>}
      </article>)}
    </section>
    {displayed.length>visibleLimit&&<button type="button" className="btn secondary"
      onClick={()=>setVisibleLimit(old=>old+8)}>Mostrar mais 8 imagens</button>}
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

    {backupAllowed&&backupPhotoId&&<section className="card data-form" aria-label="Backups clínicos privados" style={{marginTop:16}}>
      <h2>Backup e recuperação: {photos.find(p=>p.id===backupPhotoId)?.originalName??backupPhotoId}</h2>
      <p className="muted">Cópias privadas em segundo bucket R2; verificadas com SHA-256. Não são criadas automaticamente e não substituem uma política de recuperação homologada.</p>
      <label>Motivo obrigatório<textarea minLength={12} maxLength={500} rows={2} value={backupReason}
        placeholder="Justificativa administrativa sem informações médicas"
        onChange={e=>setBackupReason(e.target.value)}/></label>
      <div className="row-actions">
        <button type="button" className="btn primary" disabled={backupBusy||backupReason.trim().length<12}
          onClick={()=>void createBackup()}>{backupBusy?'Verificando…':'Criar/verificar cópia'}</button>
        <button type="button" className="btn secondary" onClick={()=>setBackupPhotoId('')}>Fechar</button>
      </div>
      <h3>Manifestos de backup</h3>
      {backupRecords.length===0?<p className="muted">Nenhuma cópia registrada.</p>:<ul>{backupRecords.map(item=><li key={item.digest}>
        <p>{(item.sizeBytes/1048576).toLocaleString('pt-BR',{maximumFractionDigits:2})} MiB · {item.createdAt?new Date(item.createdAt).toLocaleString('pt-BR'):'Data indisponível'}</p>
        <p className="muted" style={{overflowWrap:'anywhere'}}>SHA-256: {item.digest}</p>
        <button type="button" className="btn secondary" disabled={backupBusy||backupReason.trim().length<12}
          onClick={()=>void inspectBackup(item.digest)}>Verificar cópia sem restaurar</button>
        <button type="button" className="btn secondary" disabled={backupBusy||backupReason.trim().length<12}
          onClick={()=>void restoreBackup(item.digest)}>Recuperar arquivo R2 ausente</button>
      </li>)}</ul>}
      {backupNext&&<button type="button" className="btn secondary" disabled={backupBusy}
        onClick={()=>void openBackup(backupPhotoId,backupNext)}>Carregar mais</button>}
      <p className="muted">A recuperação não sobrescreve originais existentes. Restaurar da lixeira lógica é outra ação.</p>
    </section>}
  </>;
}
