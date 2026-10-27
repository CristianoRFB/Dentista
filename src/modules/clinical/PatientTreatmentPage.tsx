import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { canUse } from '../../commercial/entitlementService';
import type { Patient, Professional, Procedure } from '../../domain/types';
import { TOOTH_IDS } from '../../domain/odontogram';
import {
  planVersionId, treatmentTotalCents, type TreatmentItem, type TreatmentPlan,
  type TreatmentPlanVersion, type TreatmentStatus, TREATMENT_ITEM_STAGES,
} from '../../domain/treatmentPlan';
import { db } from '../../lib/firebase';
import { listTenantRecords } from '../../lib/tenantData';
import { createTreatmentPlan, listTreatmentPlans, listTreatmentVersions, updateTreatmentPlan } from '../../lib/treatmentPlanData';
import { demoPatients } from '../../sample/demoData';
import { useReadyTenantAccess } from '../tenant/TenantContext';

const STATUSES: {value:TreatmentStatus;label:string}[]=[
  {value:'draft',label:'Rascunho'},{value:'approved',label:'Aprovação interna registrada'},
  {value:'in_progress',label:'Em tratamento'},{value:'completed',label:'Concluído'},{value:'cancelled',label:'Cancelado'},
];
const STAGES:Record<TreatmentItem['stage'],string>={
  planned:'Planejado',in_progress:'Em andamento',completed:'Concluído',cancelled:'Cancelado',
};
const money=(cents:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
const inputPrice=(cents:number)=>String(cents/100).replace('.',',');
function parsePrice(raw:string) {
  const cleaned=raw.trim().replace(/\s/g,'');
  if(!/^\d{1,7}(?:[,\.]\d{1,2})?$/.test(cleaned)) throw new Error('Preço inválido. Informe reais e até dois centavos.');
  const [whole,decimal='']=cleaned.replace(',','.').split('.');
  const value=Number(whole)*100+Number(decimal.padEnd(2,'0'));
  if (!Number.isSafeInteger(value)||value>100_000_000) throw new Error('Preço excede o valor permitido.');
  return value;
}
function blankItem():TreatmentItem {
  return {procedureId:'',description:'',toothId:'',stage:'planned',quantity:1,unitPriceCents:0};
}
function shortDate(date:string) {
  const d=new Date(date);
  return Number.isNaN(d.valueOf())?'Data indisponível':d.toLocaleString('pt-BR');
}

export function PatientTreatmentPage() {
  const {tenantSlug='',patientId=''}=useParams();
  const session=useReadyTenantAccess();
  const [patient,setPatient]=useState<Patient|null>(null);
  const [professionals,setProfessionals]=useState<Professional[]>([]);
  const [procedures,setProcedures]=useState<Procedure[]>([]);
  const [plans,setPlans]=useState<TreatmentPlan[]>([]);
  const [versions,setVersions]=useState<TreatmentPlanVersion[]>([]);
  const [selectedId,setSelectedId]=useState('');
  const [professionalId,setProfessionalId]=useState('');
  const [items,setItems]=useState<TreatmentItem[]>([blankItem()]);
  const [prices,setPrices]=useState<string[]>(['0,00']);
  const [note,setNote]=useState('');
  const [status,setStatus]=useState<TreatmentStatus>('draft');
  const [quoteEnabled,setQuoteEnabled]=useState(false);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [edit,setEdit]=useState(false);
  const allowedQuote=canUse(session.tenant,'quotes');
  const writable=!session.isDemo && session.permissions.includes('treatment.write') && session.permissions.includes('clinical.write');
  const active=plans.find(p=>p.id===selectedId);
  const latest=versions.find(v=>v.version===active?.currentVersion);
  const total=useMemo(()=>{
    try{return treatmentTotalCents(items,quoteEnabled);}
    catch{return null;}
  },[items,quoteEnabled]);

  async function refresh(keepSelected=true) {
    setLoading(true);
    try {
      if(session.isDemo){
        setPatient(demoPatients.find(p=>p.id===patientId)??null);
        setPlans([]);setVersions([]);
        setProfessionals([]);setProcedures([]);
      }else{
        const patientSnap=await getDoc(doc(db,'tenants',session.tenant.id,'patients',patientId));
        if(!patientSnap.exists()||patientSnap.data().tenantId!==session.tenant.id) throw new Error('Paciente de outra clínica ou não encontrado.');
        const [people,catalog,found]=await Promise.all([
          listTenantRecords<Professional>(session,'professionals'),
          listTenantRecords<Procedure>(session,'procedures'),
          listTreatmentPlans(session),
        ]);
        setPatient({...patientSnap.data(),id:patientSnap.id} as Patient);
        const own=found.filter(p=>p.patientId===patientId).sort((a,b)=>b.currentVersion-a.currentVersion);
        setPlans(own);
        if(!keepSelected) setSelectedId('');
        setProfessionals(people.filter(p=>p.status==='active'));
        setProcedures(catalog.filter(p=>p.active));
        if(!professionalId) setProfessionalId(people.find(p=>p.status==='active')?.id??'');
      }
      setError('');
    }catch(cause){setError(cause instanceof Error?cause.message:'Falha ao carregar planos.');}
    finally{setLoading(false);}
  }
  useEffect(()=>{void refresh();},[session,patientId]);
  useEffect(()=>{
    let cancelled=false;
    async function load(){
      if(!selectedId||session.isDemo){setVersions([]);return;}
      try {
        const rows=await listTreatmentVersions(session,selectedId);
        if(!cancelled){setVersions(rows);setError('');}
      }catch(cause){if(!cancelled)setError(cause instanceof Error?cause.message:'Falha ao carregar versões.');}
    }
    void load();
    return ()=>{cancelled=true;};
  },[selectedId,session]);

  function openPlan(plan:TreatmentPlan) {
    setSelectedId(plan.id);setEdit(false);setError('');setMessage('');
    setProfessionalId(plan.professionalId);setVersions([]);
  }
  function newPlan(){
    setSelectedId('');setEdit(true);setStatus('draft');setQuoteEnabled(false);setItems([blankItem()]);
    setPrices(['0,00']);setNote('');setVersions([]);setError('');setMessage('');
  }
  function startRevision(){
    if(!active||!latest)return;
    setEdit(true);setStatus(active.status);setQuoteEnabled(latest.quoteEnabled);
    setItems(latest.items.map(item=>({...item})));
    setPrices(latest.items.map(item=>inputPrice(item.unitPriceCents)));
    setNote(latest.note);setError('');setMessage('');
  }
  function setItem(index:number,changes:Partial<TreatmentItem>){
    setItems(previous=>previous.map((item,i)=>i===index?{...item,...changes}:item));
  }
  function addItem(){
    if(items.length>=12)return;
    setItems(previous=>[...previous,blankItem()]);
    setPrices(previous=>[...previous,'0,00']);
  }
  function removeItem(index:number){
    if(items.length<=1)return;
    setItems(previous=>previous.filter((_,i)=>i!==index));
    setPrices(previous=>previous.filter((_,i)=>i!==index));
  }
  async function save(event:FormEvent){
    event.preventDefault();setError('');setMessage('');setSaving(true);
    try{
      if(!writable)throw new Error('Você não tem autorização para editar tratamento.');
      const finalItems=items.map((item,i)=>({...item,unitPriceCents:quoteEnabled?parsePrice(prices[i]):0}));
      if(active) {
        if(!latest)throw new Error('A versão atual precisa ser carregada.');
        await updateTreatmentPlan(session,active,{items:finalItems,note,quoteEnabled},status);
        setMessage('Nova versão registrada sem sobrescrever o histórico.');
      }else{
        const id=await createTreatmentPlan(session,patientId,professionalId,{items:finalItems,note,quoteEnabled});
        setSelectedId(id);setMessage('Plano clínico criado.');
      }
      setEdit(false);await refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível salvar o plano.');}
    finally{setSaving(false);}
  }
  function exportQuote(version:TreatmentPlanVersion){
    if(!allowedQuote||!version.quoteEnabled)return;
    const value={
      kind:'ODONTOFLOW_QUOTE_PROPOSAL_NOT_INVOICE',planId:version.planId,
      version:version.version,patientId:version.patientId,
      patientName:patient?.name??'',date:version.createdAt,status:version.status,
      items:version.items,totalCents:treatmentTotalCents(version.items,true),
      notice:'Proposta comercial, não é nota fiscal nem assinatura digital/aceite do paciente.',
    };
    const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;link.download='orcamento-'+version.planId+'-'+planVersionId(version.version)+'.json';link.click();
    URL.revokeObjectURL(url);
  }
  return <section className="treatment-page">
    <div className="page-head"><div><span className="eyebrow">Plano clínico versionado</span>
      <h1>Tratamento — {patient?.name??'Paciente'}</h1>
      <p className="muted">Procedimentos e etapas com histórico permanente. Aprovação interna não constitui consentimento ou assinatura do paciente.</p></div>
      <Link className="btn secondary" to={'/'+tenantSlug+'/app/pacientes/'+patientId+'/clinico'}>Prontuário</Link>
    </div>
    {session.isDemo&&<p className="demo-banner">Demonstração · somente leitura. Nenhum orçamento ou aprovação real.</p>}
    {(error||message)&&<p role={error?'alert':'status'} className={error?'form-error':'form-success'}>{error||message}</p>}
    {loading?<p role="status">Carregando planos…</p>:!patient?<p role="alert">Paciente não encontrado.</p>:<>
      <div className="card">
        <div className="card-title"><h2>Planos deste paciente</h2>{writable&&patient.status==='active'&&
          <button type="button" className="btn primary" onClick={newPlan}>Novo plano</button>}</div>
        {plans.length===0?<p className="muted">Nenhum plano de tratamento cadastrado.</p>:
          <div className="treatment-plan-list">{plans.map(plan=><button type="button" key={plan.id}
            className={'treatment-plan-entry'+(plan.id===selectedId?' selected':'')}
            onClick={()=>openPlan(plan)} aria-pressed={plan.id===selectedId}>
            Plano {plan.id.slice(0,8)} · {STATUSES.find(s=>s.value===plan.status)?.label??plan.status} · versão {plan.currentVersion}
          </button>)}</div>}
      </div>
      {active&&!edit&&<section className="card" style={{marginTop:16}}>
        <div className="card-title"><h2>Versão atual</h2>
          {writable&&patient.status==='active'&&!['completed','cancelled'].includes(active.status)&&
          <button type="button" className="btn primary" disabled={!latest} onClick={startRevision}>Criar revisão</button>}
        </div>
        {!latest?<p role="status">Carregando versões do plano…</p>:<>
          <p>Estado: <b>{STATUSES.find(s=>s.value===active.status)?.label}</b> · Profissional responsável: {professionals.find(p=>p.id===active.professionalId)?.displayName??active.professionalId}</p>
          <p className="muted">Versões anteriores não são editadas; cada revisão tem autoria e horário.</p>
          {versions.map(version=><article className="clinical-amendment" key={version.id}>
            <h3>Versão {version.version} — {STATUSES.find(s=>s.value===version.status)?.label}</h3>
            <p className="muted">{shortDate(version.createdAt)} · autoria: {version.createdBy}</p>
            {version.note&&<p>{version.note}</p>}
            <div className="table-card"><table className="table"><caption className="sr-only">Itens da versão {version.version}</caption>
              <thead><tr><th>Procedimento</th><th>Dente</th><th>Etapa</th>{version.quoteEnabled&&<><th>Qtde.</th><th>Valor</th></>}</tr></thead>
              <tbody>{version.items.map((item,i)=><tr key={i}><td>{item.description}</td><td>{item.toothId||'—'}</td>
                <td>{STAGES[item.stage]}</td>{version.quoteEnabled&&<><td>{item.quantity}</td><td>{money(item.unitPriceCents*item.quantity)}</td></>}</tr>)}</tbody>
            </table></div>
            {version.quoteEnabled&&<><p><b>Total da proposta: {money(treatmentTotalCents(version.items,true)??0)}</b></p>
              <p className="muted">Proposta sujeita a revisão. Não é cobrança, nota fiscal ou assinatura digital.</p>
              {allowedQuote&&<button className="btn secondary" type="button" onClick={()=>exportQuote(version)}>Exportar orçamento estruturado (JSON)</button>}
            </>}
          </article>)}
        </>}
      </section>}
      {edit&&writable&&<form className="card data-form clinical-form" style={{marginTop:16}} onSubmit={save}>
        <h2>{active?'Nova revisão do plano':'Novo plano de tratamento'}</h2>
        {!active&&<label>Profissional responsável<select required value={professionalId} onChange={e=>setProfessionalId(e.target.value)}>
          <option value="">Selecione</option>{professionals.map(p=><option value={p.id} key={p.id}>{p.displayName}</option>)}
        </select></label>}
        {active&&<label>Estado da revisão<select value={status} onChange={e=>setStatus(e.target.value as TreatmentStatus)}>
          {STATUSES.map(item=><option value={item.value} key={item.value}
            disabled={!(active.status===item.value||
              (active.status==='draft'&&['approved','cancelled'].includes(item.value))||
              (active.status==='approved'&&['in_progress','cancelled'].includes(item.value))||
              (active.status==='in_progress'&&['completed','cancelled'].includes(item.value)))}>
            {item.label}</option>)}
        </select></label>}
        {allowedQuote&&(!active||active.status==='draft')&&<label className="form-checkbox">
          <input type="checkbox" checked={quoteEnabled} onChange={e=>setQuoteEnabled(e.target.checked)} /> Incluir orçamento (Pro/Premium)
        </label>}
        {items.map((item,i)=><fieldset className="treatment-item" key={i}>
          <legend>Etapa {i+1}</legend>
          <label>Procedimento<select required value={item.procedureId} onChange={e=>{
            const proc=procedures.find(p=>p.id===e.target.value);
            setItem(i,{procedureId:e.target.value,description:proc?.name??'',unitPriceCents:0});
            setPrices(previous=>previous.map((v,n)=>n===i?inputPrice(proc?.defaultPriceCents??0):v));
          }}>
            <option value="">Selecione procedimento ativo</option>{procedures.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}
          </select></label>
          <div className="form-grid">
            <label>Descrição<input required minLength={3} maxLength={160} value={item.description} onChange={e=>setItem(i,{description:e.target.value})} /></label>
            <label>Dente (FDI, opcional)<select value={item.toothId} onChange={e=>setItem(i,{toothId:e.target.value})}>
              <option value="">Sem dente específico</option>{TOOTH_IDS.map(t=><option value={t} key={t}>{t}</option>)}
            </select></label>
          </div>
          <label>Etapa<select value={item.stage} onChange={e=>setItem(i,{stage:e.target.value as TreatmentItem['stage']})}>
            {TREATMENT_ITEM_STAGES.map(stage=><option value={stage} key={stage}>{STAGES[stage]}</option>)}
          </select></label>
          {quoteEnabled&&<div className="form-grid">
            <label>Quantidade<input type="number" required min={1} max={20} value={item.quantity} onChange={e=>setItem(i,{quantity:Number(e.target.value)})}/></label>
            <label>Valor unitário (R$)<input inputMode="decimal" required value={prices[i]??'0,00'}
              onChange={e=>setPrices(previous=>previous.map((v,n)=>n===i?e.target.value:v))}/></label>
          </div>}
          {items.length>1&&(!active||active.status==='draft')&&<button type="button" className="text-button" onClick={()=>removeItem(i)}>Remover item</button>}
        </fieldset>)}
        {items.length<12&&(!active||active.status==='draft')&&<button type="button" className="btn secondary" onClick={addItem}>Adicionar procedimento</button>}
        {quoteEnabled&&<p className="muted">Total atual: {total===null?'Verifique os valores':money(total)} · sem cobrança automática.</p>}
        <label>Observações<textarea maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} /></label>
        <div className="form-actions">
          <button type="submit" className="btn primary" disabled={saving}>{saving?'Salvando versão…':'Salvar versão auditada'}</button>
          <button type="button" className="btn secondary" onClick={()=>setEdit(false)}>Cancelar</button>
        </div>
      </form>}
    </>}
  </section>;
}
