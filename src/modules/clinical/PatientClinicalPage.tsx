import { Link, useParams } from 'react-router-dom';
import { demoPatients } from '../../sample/demoData';
export function PatientClinicalPage() {
  const {tenantSlug='demo-clinica',patientId='p1'}=useParams();
  const patient=demoPatients.find(p=>p.id===patientId);
  return <><h1>{patient?.name ?? 'Paciente'}</h1><p className="muted">Área clínica — prontuário não deve ser liberado à recepção por padrão.</p>
  <div className="grid cols-2"><div className="card"><h2>Prontuário</h2><p>Registros append-only + adendos rastreáveis.</p></div>
  <div className="card"><h2>Odontograma</h2><p>Estado atual derivado de eventos/histórico.</p></div>
  <div className="card"><h2>Plano de tratamento</h2><p>Itens, snapshots de preço, aprovação e execução.</p></div>
  <div className="card"><h2>Fotos clínicas</h2><p>R2 privado + cache local.</p><Link to={`/${tenantSlug}/app/pacientes/${patientId}/fotos`}>Abrir fotos →</Link></div></div></>;
}
