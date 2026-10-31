import type { Tenant } from '../../domain/types';
import { canUse } from '../../commercial/entitlementService';

export interface WorkspaceLink {id:string;label:string;description:string;to:string;icon:string;end?:boolean}
export interface WorkspaceGroup {id:string;label:string;items:WorkspaceLink[]}
type Area={id:string;label:string;description:string;icon:string;path:string;permission?:string;anyPermission?:string[];feature?:Parameters<typeof canUse>[1];end?:boolean};
const areas:ReadonlyArray<{id:string;label:string;items:Area[]}>= [
  {id:'inicio',label:'Visão geral',items:[
    {id:'inicio',label:'Início',description:'Acompanhe os atendimentos e veja por onde começar.',icon:'⌂',path:'',end:true},
  ]},
  {id:'atendimento',label:'Atendimento',items:[
    {id:'agenda',label:'Agenda',description:'Consulte horários e acompanhe os atendimentos.',icon:'▦',path:'/agenda',permission:'appointments.read',feature:'agenda'},
    {id:'pacientes',label:'Pacientes',description:'Localize cadastros, prontuários e tratamentos autorizados.',icon:'◫',path:'/pacientes',permission:'patients.read',feature:'patients'},
    {id:'retornos',label:'Retornos',description:'Organize contatos de acompanhamento pendentes.',icon:'↺',path:'/retornos',permission:'recalls.read',feature:'recall_center'},
  ]},
  {id:'solicitacoes',label:'Solicitações e convites',items:[
    {id:'pre-cadastros',label:'Pré-cadastros',description:'Revise informações enviadas pelos pacientes.',icon:'◇',path:'/pre-cadastros',permission:'intake.read',feature:'intake_link'},
    {id:'convites',label:'Agendamentos e convites',description:'Gere links e revise solicitações públicas autorizadas.',icon:'↗',path:'/convites-agenda',permission:'appointments.manage',feature:'agenda'},
  ]},
  {id:'configuracao',label:'Organização da clínica',items:[
    {id:'recursos',label:'Cadeiras e salas',description:'Confira os recursos usados pela agenda.',icon:'□',path:'/recursos',permission:'resources.read',feature:'physical_resources'},
    {id:'cadastros',label:'Equipe e procedimentos',description:'Consulte profissionais e serviços cadastrados.',icon:'⚙',path:'/cadastros',
      anyPermission:['professionals.read','procedures.read','professionals.manage','procedures.manage'],feature:'professionals'},
  ]},
];

export function getWorkspaceNavigation(base:string,tenant:Tenant,permissions:readonly string[]):WorkspaceGroup[]{
  return areas.map(group=>({
    id:group.id,label:group.label,
    items:group.items.filter(item=>
      (!item.permission||permissions.includes(item.permission)) &&
      (!item.anyPermission||item.anyPermission.some(permission=>permissions.includes(permission))) &&
      (!item.feature||canUse(tenant,item.feature))
    ).map(item=>({id:item.id,label:item.label,description:item.description,
      icon:item.icon,to:base+item.path,end:item.end})),
  })).filter(group=>group.items.length>0);
}

export function workspaceContext(pathname:string,groups:WorkspaceGroup[],base:string){
  if(pathname===base+'/ajuda')return {label:'Ajuda e orientações',description:'Aprenda a realizar cada tarefa disponível no seu perfil.'};
  const items=groups.flatMap(group=>group.items);
  const found=items.filter(item=>pathname===item.to || (!item.end&&pathname.startsWith(item.to+'/')))
    .sort((a,b)=>b.to.length-a.to.length)[0];
  return found?{label:found.label,description:found.description}:
    {label:'Área da clínica',description:'Utilize os atalhos e o menu para encontrar a próxima tarefa.'};
}
