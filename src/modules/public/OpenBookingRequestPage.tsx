import {useEffect,useRef,useState,type FormEvent} from 'react';
import {Link,useParams} from 'react-router-dom';
import {doc,getDoc} from 'firebase/firestore';
import {db} from '../../lib/firebase';
import {bookingLocalBounds,parseBookingLocalInput} from '../../lib/bookingTime';
import {submitOpenBookingRequest} from '../../lib/publicBookingClient';
import {demoModeEnabled} from '../auth/AuthRoutes';

type TurnstileApi={
  render:(element:HTMLElement,settings:{
    sitekey:string;action:string;callback:(token:string)=>void;
    'expired-callback':()=>void;'error-callback':()=>void;
  })=>string;
  remove:(id:string)=>void;reset:(id?:string)=>void;
};
const clientKey=import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim()??'';
const w=()=>window as Window & {turnstile?:TurnstileApi};
export function OpenBookingRequestPage(){
  const {tenantSlug=''}=useParams();
  const [enabled,setEnabled]=useState(false);
  const [checking,setChecking]=useState(true);
  const [name,setName]=useState('');
  const [phone,setPhone]=useState('');
  const [email,setEmail]=useState('');
  const [dateTime,setDateTime]=useState('');
  const [bounds]=useState(()=>bookingLocalBounds());
  const [captcha,setCaptcha]=useState('');
  const [captchaError,setCaptchaError]=useState('');
  const widgetContainer=useRef<HTMLDivElement>(null);
  const [busy,setBusy]=useState(false);
  const [completed,setCompleted]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{
    let cancelled=false;
    async function load(){
      setEnabled(false);setChecking(true);
      if(demoModeEnabled()||!clientKey){setChecking(false);return;}
      try{
        const slug=await getDoc(doc(db,'tenantSlugs',tenantSlug));
        if(!slug.exists()||slug.data().status!=='active')return;
        const profile=await getDoc(doc(db,'tenants',String(slug.data().tenantId),'publicProfile','public'));
        if(!cancelled)setEnabled(profile.exists()&&profile.data().openBookingRequestsEnabled===true);
      }catch{if(!cancelled)setError('Não foi possível verificar a disponibilidade desta página.');}
      finally{if(!cancelled)setChecking(false);}
    }
    void load();
    return()=>{cancelled=true;};
  },[tenantSlug]);
  useEffect(()=>{
    if(!enabled||!clientKey||!widgetContainer.current)return;
    let disposed=false,widgetId:string|undefined;
    const render=()=>{
      if(disposed||!w().turnstile||!widgetContainer.current||widgetId)return;
      widgetId=w().turnstile!.render(widgetContainer.current,{
        sitekey:clientKey,action:'open_booking_request',
        callback:token=>{if(!disposed){setCaptcha(token);setCaptchaError('');}},
        'expired-callback':()=>{if(!disposed)setCaptcha('');},
        'error-callback':()=>{if(!disposed){setCaptcha('');setCaptchaError('Não foi possível validar a verificação humana.');}},
      });
    };
    if(w().turnstile)render();
    else{
      const existing=document.querySelector<HTMLScriptElement>('script[data-open-booking-turnstile]');
      if(existing)existing.addEventListener('load',render,{once:true});
      else{
        const script=document.createElement('script');
        script.dataset.openBookingTurnstile='true';script.async=true;
        script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.addEventListener('load',render,{once:true});
        script.addEventListener('error',()=>{if(!disposed)setCaptchaError('Verificação humana indisponível.');},{once:true});
        document.head.appendChild(script);
      }
    }
    return()=>{disposed=true;if(widgetId&&w().turnstile)w().turnstile!.remove(widgetId);};
  },[enabled,tenantSlug]);
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(!captcha||!enabled||busy)return;
    setBusy(true);setError('');
    try{
      const preferredAt=parseBookingLocalInput(dateTime);
      await submitOpenBookingRequest({tenantSlug,name,phone,email,preferredAt,turnstileToken:captcha});
      setCompleted(true);setCaptcha('');
    }catch(e){
      setError(e instanceof Error?e.message:'Não foi possível enviar esta solicitação.');
      setCaptcha('');if(w().turnstile)w().turnstile!.reset();
    }finally{setBusy(false);}
  }
  return <main className="booking-page"><section className="booking-card">
    <div className="booking-top"><Link className="brand" to={'/'+tenantSlug}>Voltar à clínica</Link></div>
    {checking?<p role="status">Conferindo disponibilidade da clínica…</p>:completed?
      <><h1>Solicitação recebida</h1><p>A clínica poderá entrar em contato após analisar seu pedido.
      <strong> Nenhuma consulta foi reservada ou confirmada.</strong></p>
      <Link className="btn primary" to={'/'+tenantSlug}>Voltar à clínica</Link></>:
    !enabled?<><h1>Solicitação online indisponível</h1><p>Entre em contato diretamente com a clínica para agendar um atendimento.
    Esta página não aceita reservas anônimas sem proteção habilitada.</p>
    <Link className="btn secondary" to={'/'+tenantSlug}>Voltar à clínica</Link></>:
    <><span className="eyebrow">Primeiro contato</span><h1>Solicitar um agendamento</h1>
      <p>Informe seus dados de contato e um horário de preferência. A clínica analisará a solicitação e poderá entrar em contato.
      <strong> O horário não fica reservado e não há cobrança.</strong></p>
      {error&&<p className="form-error" role="alert">{error}</p>}
      <form className="data-form" onSubmit={e=>void submit(e)}>
        <label>Nome completo<input required autoComplete="name" minLength={2} maxLength={160}
          value={name} onChange={e=>setName(e.target.value)}/></label>
        <label>Telefone para retorno<input required autoComplete="tel" maxLength={24}
          value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(11) 99999-9999"/></label>
        <label>E-mail (opcional)<input type="email" autoComplete="email" maxLength={254}
          value={email} onChange={e=>setEmail(e.target.value)}/></label>
        <label>Data e horário desejados<input required type="datetime-local" step="60"
          min={bounds.min} max={bounds.max} value={dateTime} onChange={e=>setDateTime(e.target.value)}/></label>
        <p className="muted">Não envie informações médicas. Seus dados serão usados pela clínica para avaliar o pedido.
          A preferência não representa disponibilidade confirmada.</p>
        <div ref={widgetContainer} aria-label="Verificação humana Cloudflare Turnstile"/>
        {captchaError&&<p className="form-error" role="alert">{captchaError}</p>}
        <button className="btn primary large" type="submit" disabled={busy||!captcha}>
          {busy?'Enviando…':'Enviar solicitação à clínica'}</button>
      </form>
    </>}
  </section></main>;
}
