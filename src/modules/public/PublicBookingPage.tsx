import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { demoModeEnabled } from '../auth/AuthRoutes';

const slots = ['09:00', '10:30', '14:00', '15:30', '17:00'];

export function PublicBookingPage() {
  const { tenantSlug = 'demo-clinica' } = useParams();
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState('14:00');

  if (!demoModeEnabled() || tenantSlug !== 'demo-clinica') return <main className="state-page">
    <h1>Agendamento online indisponível</h1><p>Este tenant ainda não habilitou o fluxo público de agendamento.</p>
    <Link to={'/' + tenantSlug}>Voltar à página da clínica</Link>
  </main>;

  return <main className="booking-page"><section className="booking-card">
    <p className="demo-banner">Modo demonstrativo · slots e dados fictícios; nenhum agendamento é gravado.</p>
    <div className="booking-top"><Link to={'/' + tenantSlug} className="brand"><span className="brand-mark">A</span><span>Clínica Aurora · demonstração</span></Link><span aria-live="polite">Etapa {step} de 3</span></div>
    {step === 1 && <><span className="eyebrow">Fluxo de demonstração</span><h1>O que você precisa?</h1><div className="booking-options">
      {['Consulta e avaliação','Profilaxia','Restauração'].map(name => <button key={name} type="button" onClick={() => setStep(2)}><b>{name}</b><span>Exemplo de atendimento</span></button>)}
    </div></>}
    {step === 2 && <><span className="eyebrow">Horários fictícios</span><h1>Escolha um exemplo</h1><p className="muted">A confirmação pública ainda não está habilitada.</p><div className="slot-grid">
      {slots.map(slot => <button type="button" className={selected === slot ? 'selected' : ''} aria-pressed={selected === slot} onClick={() => setSelected(slot)} key={slot}>{slot}</button>)}
    </div><div className="booking-actions"><button type="button" className="btn secondary" onClick={() => setStep(1)}>← Voltar</button><button type="button" className="btn primary" onClick={() => setStep(3)}>Continuar →</button></div></>}
    {step === 3 && <><span className="eyebrow">Demonstração</span><h1>Fluxo de exemplo.</h1><div className="booking-summary">
      <div><span>Serviço</span><b>Consulta e avaliação</b></div><div><span>Horário</span><b>{selected}</b></div><div><span>Clínica</span><b>Clínica Aurora · demonstração</b></div>
    </div><p className="muted">Nada foi enviado à clínica nem registrado na agenda.</p><div className="booking-actions"><button type="button" className="btn secondary" onClick={() => setStep(2)}>← Voltar</button><Link className="btn primary" to={'/' + tenantSlug}>Concluir</Link></div></>}
  </section></main>;
}
