import { Link, useParams } from 'react-router-dom';
import { demoPatients } from '../../sample/demoData';
export function PatientsPage() {
  const {tenantSlug='demo-clinica'}=useParams();
  return <><h1>Pacientes</h1><p className="muted">Patient é entidade do tenant e não depende de conta de login.</p>
  <div className="card"><table className="table"><thead><tr><th>Paciente</th><th>Contato</th><th></th></tr></thead><tbody>
  {demoPatients.map(p => <tr key={p.id}><td>{p.name}</td><td>{p.phone}</td><td><Link to={`/${tenantSlug}/app/pacientes/${p.id}/clinico`}>Abrir clínico</Link></td></tr>)}
  </tbody></table></div></>;
}
