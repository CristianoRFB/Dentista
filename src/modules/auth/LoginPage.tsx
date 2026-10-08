import { FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { demoModeEnabled } from './AuthRoutes';

function friendlyAuthError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code.includes('invalid-credential') || code.includes('user-not-found') || code.includes('wrong-password')) {
    return 'E-mail ou senha incorretos.';
  }
  if (code.includes('too-many-requests')) return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
  return 'Não foi possível entrar. Confira os dados e tente novamente.';
}

export function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';

  if (loading) return <main className="state-page" role="status">Carregando…</main>;
  if (user) return <Navigate to={from} replace />;
  if (demoModeEnabled()) return <Navigate to="/demo-clinica/app" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (cause) {
      setError(friendlyAuthError(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="auth-page">
    <section className="auth-card" aria-labelledby="login-title">
      <Link className="brand" to="/"><span className="brand-mark">O</span><span>OdontoFlow</span></Link>
      <span className="eyebrow">Acesso seguro</span>
      <h1 id="login-title">Entre na sua clínica</h1>
      <p className="muted">Use o e-mail associado à sua equipe.</p>
      <form className="data-form" onSubmit={onSubmit}>
        <label>E-mail<input required autoComplete="username" type="email" value={email} onChange={event => setEmail(event.target.value)} /></label>
        <label>Senha<input required autoComplete="current-password" type="password" value={password} onChange={event => setPassword(event.target.value)} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn primary" disabled={submitting} type="submit">{submitting ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </section>
  </main>;
}
