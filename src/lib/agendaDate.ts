/** Selected day in the device/clinic calendar; DST-safe local midnight boundaries. */
export function localDateString(date:Date):string{
  const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
export function agendaDayWindow(value:string){
  if(!/^\d{4}-\d\d-\d\d$/.test(value))throw new Error('Dia inválido');
  const [year,month,day]=value.split('-').map(Number);
  const start=new Date(year,month-1,day);
  if(!Number.isFinite(start.getTime())||localDateString(start)!==value)throw new Error('Dia impossível');
  const end=new Date(year,month-1,day+1);
  return {start,end};
}
export function adjacentAgendaDay(value:string,offset:-1|1){
  const {start}=agendaDayWindow(value);
  return localDateString(new Date(start.getFullYear(),start.getMonth(),start.getDate()+offset));
}
