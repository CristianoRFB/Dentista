import { useEffect,useState,type FormEvent } from 'react';
import { readInviteToken, scrubInviteTokenFromAddressBar } from '../../lib/personalInviteUrl';
import { Link,useParams } from 'react-router-dom';
import { demoModeEnabled } from '../auth/AuthRoutes';
import { submitPublicBooking } from '../../lib/publicBookingClient';
import { bookingLocalBounds, parseBookingLocalInput } from '../../lib/bookingTime';

const demoSlots=['09:00','10:30','14:00','15:30','17:00'];
export function PublicBookingPage(){
  const {tenantSlug=''}=useParams();

  const demo=demoModeEnabled()&&tenantSlug==='demo-clinica';
  const [token,setToken]=useState(()=>readInviteToken(window.location));
  useEffect(()=>scrubInviteTokenFromAddressBar(),[]);
  const validToken=/^[A-Za-z0-9_-]{43}$/.test(token);
  const [dateTime,setDateTime]=useState('');
  const [timeBounds]=useState(()=>bookingLocalBounds());
  const [selected,setSelected]=useState('14:00');
  const [step,setStep]=useState(1);
  const [busy,setBusy]=useState(false);
  const [booked,setBooked]=useState('');
  const [error,setError]=useState('');
  const browserZone=Intl.DateTimeFormat().resolvedOptions().timeZone;
  async function send(e:FormEvent) {
    e.preventDefault();setError('');setBusy(true);
    try{
      const startsAt=parseBookingLocalInput(dateTime);
      const result=await submitPublicBooking(tenantSlug,token,startsAt);
      setBooked(result.startsAt);
      setToken('');
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível fazer a reserva.');}
    finally{setBusy(false);}
  }
  if(!demo&&!validToken&&!booked)return <main className="state-page"><h1>Agendamento por convite</h1>
    <p>Peça à recepção um link individual de agendamento. Não é possível reservar horários sem o convite da clínica.</p>
    <Link to={'/'+tenantSlug}>Voltar à clínica</Link></main>;
  if(!demo)return <main className="booking-page"><section className="booking-card">
    <div className="booking-top"><Link className="brand" to={'/'+tenantSlug}><span className="brand-mark">O</span><span>Agendamento da clínica</span></Link></div>
    {booked?<><span className="eyebrow">Agendamento registrado</span>
      <h1>Horário confirmado no sistema.</h1>
      <p>Data informada: <b>{new Date(booked).toLocaleString('pt-BR')}</b></p>
      <p className="muted">Em caso de mudança ou cancelamento, entre em contato diretamente com a clínica. Não há cobrança neste formulário.</p>
      <Link className="btn primary" to={'/'+tenantSlug}>Voltar à clínica</Link></>:<>
      <span className="eyebrow">Link individual e de uso único</span><h1>Selecione o horário</h1>
      <p>O profissional, o procedimento e a duração já foram definidos pela clínica. A disponibilidade é conferida ao enviar a reserva; horários concorrentes são recusados.</p>
      <p className="muted">Horário no fuso do dispositivo: {browserZone}. Se estiver em outra região, confirme a diferença de fuso com a clínica.</p>
      {error&&<p className="form-error" role="alert">{error}</p>}
      <form className="data-form" onSubmit={e=>void send(e)}>
        <label htmlFor="booking-time">Data e horário desejados</label>
        <input id="booking-time" type="datetime-local" required step="60"
          min={timeBounds.min} max={timeBounds.max} value={dateTime}
          aria-describedby="booking-time-hint"
          onChange={e=>{setDateTime(e.target.value);setError('');}} />
        <p id="booking-time-hint" className="muted">Escolha um horário entre cinco minutos e 60 dias a partir de agora. O horário informado é interpretado no fuso do seu dispositivo e será conferido novamente pela clínica. O convite expira em sete dias ou após o primeiro uso.</p>
        <button className="btn primary large" disabled={busy} type="submit">{busy?'Conferindo disponibilidade…':'Confirmar horário disponível'}</button>
      </form>
      </>}
  </section></main>;
  return <main className="booking-page"><section className="booking-card">
    <p className="demo-banner">Demonstração · horários fictícios; nenhum agendamento é gravado.</p>
    <div className="booking-top"><Link to={'/'+tenantSlug} className="brand"><span className="brand-mark">A</span><span>Clínica Aurora · demonstração</span></Link><span>Etapa {step} de 3</span></div>
    {step===1?<><h1>Selecione um procedimento ilustrativo</h1><div className="booking-options">
      {['Consulta e avaliação','Profilaxia','Restauração'].map(label=><button key={label} type="button" onClick={()=>setStep(2)}>{label}</button>)}
    </div></>:step===2?<><h1>Horários fictícios</h1><div className="slot-grid">
      {demoSlots.map(slot=><button type="button" key={slot} aria-pressed={selected===slot}
        className={selected===slot?'selected':''} onClick={()=>setSelected(slot)}>{slot}</button>)}</div>
      <div className="booking-actions"><button className="btn secondary" onClick={()=>setStep(1)}>Voltar</button>
      <button className="btn primary" onClick={()=>setStep(3)}>Continuar</button></div>
    </>:<><h1>Simulação concluída</h1><p>Horário fictício: {selected}. Nenhum horário foi reservado.</p>
      <Link className="btn primary" to={'/'+tenantSlug}>Voltar à clínica</Link></>}
  </section></main>;
}
