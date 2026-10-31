import {Link,useParams} from 'react-router-dom';
import {useReadyTenantAccess} from './TenantContext';
import {getWorkspaceNavigation} from './workspaceNavigation';

export function TenantHelpPage(){
  const {tenantSlug=''}=useParams();
  const session=useReadyTenantAccess();
  const base='/'+tenantSlug+'/app';
  const groups=getWorkspaceNavigation(base,session.tenant,session.permissions);
  return <section className="help-page" aria-labelledby="help-title">
    <div className="page-head"><div>
      <span className="eyebrow">Orientações da clínica</span>
      <h1 id="help-title">Como usar o OdontoFlow</h1>
      <p className="muted">Escolha o que deseja fazer. Você verá somente as áreas disponíveis para o seu perfil.</p>
    </div><Link className="btn secondary" to={base}>Voltar ao início</Link></div>
    {session.isDemo&&<p className="demo-banner">Modo demonstrativo: você pode conhecer as telas, sem alterar dados reais.</p>}
    <div className="card help-start">
      <h2>Por onde começo?</h2>
      <p>Primeiro abra a tarefa no menu. Confira os dados e as permissões antes de salvar. Quando houver uma ação de confirmação, leia o aviso até o fim.</p>
      <p className="muted">Se uma opção não estiver nesta página, o acesso pode depender do seu papel na clínica, do plano ou de uma configuração ainda não habilitada.</p>
    </div>
    {groups.map(group=><section key={group.id} aria-labelledby={'help-group-'+group.id} className="help-group">
      <h2 id={'help-group-'+group.id}>{group.label}</h2>
      <div className="help-grid">
        {group.items.map(item=><article className="card help-task" key={item.id}>
          <h3>{item.label}</h3>
          <p>{item.description}</p>
          <Link className="btn secondary" to={item.to}>Abrir {item.label.toLowerCase()}</Link>
        </article>)}
      </div>
    </section>)}
    <section className="card help-safety">
      <h2>Segurança e informações importantes</h2>
      <ul>
        <li>O prontuário e as fotos são protegidos por permissões: não compartilhe sua sessão.</li>
        <li>Um pedido de agendamento público não é uma consulta confirmada. Verifique a agenda e contate o paciente antes de registrar o atendimento.</li>
        <li>Inativar um paciente e arquivar uma foto não significam apagar o histórico clínico.</li>
        <li>Se encontrar uma mensagem de acesso negado, solicite revisão de permissões à pessoa responsável pela clínica.</li>
      </ul>
    </section>
  </section>;
}
