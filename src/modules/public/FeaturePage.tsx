import { Link, useParams } from 'react-router-dom';

const featureCopy: Record<string,{eyebrow:string,title:string,description:string,bullets:string[]}> = {
  agenda:{eyebrow:'Agenda odontológica',title:'A disponibilidade real da clínica, não só quadradinhos no calendário.',description:'Profissionais, duração, cadeiras, salas, bloqueios e retornos participam do cálculo de disponibilidade.',bullets:['Controle por cadeira/sala','Alertas de conflito','Bloqueios e encaixes','Central de retorno']},
  prontuario:{eyebrow:'Prontuário clínico',title:'Histórico clínico com rastreabilidade.',description:'Registros consolidados preservam autoria e alterações importantes entram como adendos, evitando edição silenciosa.',bullets:['Evoluções por atendimento','Anexos e exames','Autoria e timestamp','Adendos rastreáveis']},
  odontograma:{eyebrow:'Odontograma',title:'O estado atual explicado pelo histórico.',description:'O odontograma foi pensado como estado derivado de eventos, permitindo acompanhar a evolução clínica ao longo do tempo.',bullets:['Eventos por dente/região','Condições atuais','Procedimentos planejados','Histórico preservado']},
  'fotos-clinicas':{eyebrow:'Fotos clínicas',title:'Mídia clínica organizada por contexto.',description:'Classifique imagens por vista, região, dente, fase e status; compare momentos e mantenha os binários em armazenamento privado.',bullets:['Upload em lote','Status não verificada/verificada','Timeline','R2 privado + cache local']},
  tratamentos:{eyebrow:'Planos de tratamento',title:'Planejamento, aceite e execução conectados.',description:'O plano clínico continua separado da cobrança, mas ambos preservam snapshots do momento em que foram apresentados.',bullets:['Itens e procedimentos','Status do plano','Snapshots de preço','Acompanhamento de execução']}
};

export function FeaturePage(){
  const {feature='agenda'}=useParams();
  const item=featureCopy[feature] ?? featureCopy.agenda;
  return <main className="feature-page-public"><header className="marketing-nav marketing-container"><Link className="brand" to="/"><span className="brand-mark">O</span><span>OdontoFlow</span></Link><Link className="btn secondary" to="/">← Voltar</Link></header><section className="feature-hero marketing-container"><span className="eyebrow">{item.eyebrow}</span><h1>{item.title}</h1><p>{item.description}</p><div className="hero-actions"><Link className="btn primary large" to="/demo-clinica/app">Ver demonstração</Link><Link className="btn secondary large" to="/precos">Ver planos</Link></div></section><section className="marketing-container feature-detail-grid">{item.bullets.map((b,i)=><article className="feature-card" key={b}><span className="feature-icon">0{i+1}</span><h3>{b}</h3><p>Estrutura prevista na fundação v01 e sujeita à validação com uso real antes de produção.</p></article>)}</section></main>;
}
