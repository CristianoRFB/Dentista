import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
export function PublicIntakePage(){
  const {tenantSlug='demo-clinica'}=useParams();
  const [sent,setSent]=useState(false);
  const submit=(e:FormEvent)=>{e.preventDefault();setSent(true)};
  return <main className="intake-page"><section className="intake-card"><div className="brand"><span className="brand-mark">O</span><span>Clínica Aurora</span></div>{sent?<><span className="eyebrow">Recebido</span><h1>Cadastro enviado para revisão.</h1><p>A recepção ainda precisa revisar e confirmar antes que qualquer informação seja incorporada ao cadastro oficial.</p><Link className="btn primary" to={`/${tenantSlug}/app`}>Voltar à demonstração</Link></>:<><span className="eyebrow">Pré-cadastro seguro</span><h1>Conte o básico antes da consulta.</h1><p>Este formulário é demonstrativo. A arquitetura prevê token de uso limitado e revisão pela recepção.</p><form onSubmit={submit} className="intake-form"><label>Nome completo<input required placeholder="Seu nome"/></label><label>Telefone<input required placeholder="(00) 00000-0000"/></label><label>E-mail<input type="email" placeholder="voce@exemplo.com"/></label><label>Observação opcional<textarea rows={4} placeholder="Algo que a recepção deva saber antes de falar com você?"/></label><button className="btn primary large" type="submit">Enviar para revisão</button></form></>}</section></main>
}
