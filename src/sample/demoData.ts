import type { Appointment, Patient, Recall, ScheduleResource, Tenant } from '../domain/types';

export const demoTenants:Tenant[]=[
  {
    id:'tenant_demo',
    name:'Clínica Aurora',
    slug:'demo-clinica',
    status:'active',
    planId:'premium_demo',
    subscriptionStatus:'demo',
    features:{odontogram:true,clinicalPhotos:true,recalls:true,patientIntake:true,resources:true,publicSite:true,publicBooking:true},
    limits:{professionals:5,resources:4},
    branding:{primaryColor:'#163d3a',accentColor:'#72b9ad',publicName:'Clínica Aurora',tagline:'Odontologia clara, humana e organizada.'}
  },
  {id:'tenant_test_b',name:'Odonto Teste B',slug:'odonto-teste-b',status:'active',planId:'essential',subscriptionStatus:'trial',features:{odontogram:true},limits:{professionals:1}}
];

export const demoPatients:Patient[]=[
  {id:'p1',tenantId:'tenant_demo',name:'Marina Souza',phone:'(17) 99999-1001',searchName:'marina souza',status:'active'},
  {id:'p2',tenantId:'tenant_demo',name:'Carlos Ribeiro',phone:'(17) 99999-1002',searchName:'carlos ribeiro',status:'active'},
  {id:'p3',tenantId:'tenant_demo',name:'Lívia Martins',phone:'(17) 99999-1003',searchName:'livia martins',status:'active'}
];

export const demoResources:ScheduleResource[]=[
  {id:'chair-01',tenantId:'tenant_demo',name:'Cadeira 01',type:'chair',active:true},
  {id:'chair-02',tenantId:'tenant_demo',name:'Cadeira 02',type:'chair',active:true},
  {id:'room-xray',tenantId:'tenant_demo',name:'Sala de imagem',type:'room',active:true}
];

const today=new Date();
today.setHours(9,0,0,0);
const plus=(minutes:number)=>new Date(today.getTime()+minutes*60*1000).toISOString();
export const demoAppointments:Appointment[]=[
  {id:'a1',tenantId:'tenant_demo',patientId:'p1',professionalId:'dentist_demo',startsAt:plus(0),endsAt:plus(60),status:'confirmed',procedureIds:['consulta'],resourceId:'chair-01'},
  {id:'a2',tenantId:'tenant_demo',patientId:'p2',professionalId:'dentist_demo',startsAt:plus(90),endsAt:plus(150),status:'checked_in',procedureIds:['profilaxia'],resourceId:'chair-01'},
  {id:'a3',tenantId:'tenant_demo',patientId:'p3',professionalId:'dentist_02',startsAt:plus(180),endsAt:plus(240),status:'pending',procedureIds:['restauracao'],resourceId:'chair-02'}
];

const recallDate=new Date();
recallDate.setDate(recallDate.getDate()+7);
export const demoRecalls:Recall[]=[
  {id:'r1',tenantId:'tenant_demo',patientId:'p1',reason:'Retorno de profilaxia',dueAt:recallDate.toISOString(),status:'due'},
  {id:'r2',tenantId:'tenant_demo',patientId:'p3',reason:'Revisão de restauração',dueAt:new Date(recallDate.getTime()+7*86400000).toISOString(),status:'planned'}
];
