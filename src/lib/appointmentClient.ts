import { auth } from './firebase';
import type { Appointment, AppointmentStatus } from '../domain/types';

const workerUrl = import.meta.env.VITE_CLINICAL_MEDIA_API_URL;

export interface AppointmentInput {
  tenantId: string;
  patientId: string;
  professionalId: string;
  startsAt: string;
  endsAt: string;
  procedureIds: string[];
  resourceId?: string;
  status?: AppointmentStatus;
  appointmentId?: string;
}

export async function saveAppointment(input: AppointmentInput): Promise<Appointment> {
  if (!workerUrl) throw new Error('A API operacional ainda não foi configurada.');
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Autenticação necessária');
  const response = await fetch(workerUrl.replace(/\/$/, '') + '/v1/appointments', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    if (response.status === 409) throw new Error('Este horário acabou de ser reservado. Atualize a agenda e escolha outro.');
    if (response.status === 403) throw new Error('Você não tem permissão para alterar a agenda.');
    throw new Error('Não foi possível salvar o agendamento.');
  }
  return await response.json() as Appointment;
}

export async function cancelAppointment(tenantId: string, appointmentId: string) {
  if (!workerUrl) throw new Error('A API operacional ainda não foi configurada.');
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Autenticação necessária');
  const url = new URL(workerUrl.replace(/\/$/, '') + '/v1/appointments/' + encodeURIComponent(appointmentId) + '/cancel');
  url.searchParams.set('tenantId', tenantId);
  const response = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + token } });
  if (!response.ok) throw new Error('Não foi possível cancelar o agendamento.');
}
