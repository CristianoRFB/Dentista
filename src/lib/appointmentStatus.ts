import type { AppointmentStatus } from '../domain/types';

const LABELS:Record<AppointmentStatus,string>={pending:'Pendente',confirmed:'Confirmado',checked_in:'Chegou',in_service:'Em atendimento',completed:'Concluído',cancelled:'Cancelado',no_show:'Não compareceu'};
/** Presentation only: the persisted status and server rules remain unchanged. */
export function appointmentStatusLabel(status:AppointmentStatus):string{return LABELS[status]??'Estado desconhecido';}
