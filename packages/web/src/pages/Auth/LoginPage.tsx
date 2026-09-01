import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { UserRole } from '@profils-actifs/shared';
import { useAuth } from '../../hooks/useAuth.js';
import { toApiError } from '../../services/api.js';

/** Where each role lands after signing in. */
const HOME_BY_ROLE: Record<UserRole, string> = {
  RECRUITER: '/recruteur',
  ADMIN: '/admin',
  APPLICANT: '/',
};

interface LocationState {
  from?: string;
}

/**
 * Minimal sign-in form so the recruiter space is usable end to end. Domain A
 * owns authentication screens and is expected to replace this page with the
 * full flow (registration, password rules, error copy).
 */
export const LoginPage = () => {
  const { login, status, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (status === 'authenticated' && user) {
    return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  }

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const signedIn = await login(email, password);
      const from = (location.state as LocationState | null)?.from;
      navigate(from ?? HOME_BY_ROLE[signedIn.role], { replace: true });
    } catch (cause: unknown) {
      setError(toApiError(cause).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <form className="card auth-card" onSubmit={submit}>
        <h1>ProfilsActifs</h1>
        <p className="auth-card__hint">Connectez-vous à votre espace.</p>

        {error && (
          <p className="alert alert--error" role="alert">
            {error}
          </p>
        )}

        <div className="field">
          <label className="field__label" htmlFor="email">
            Adresse e-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="password">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <button type="submit" className="button button--primary" disabled={isSubmitting}>
          {isSubmitting ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </main>
  );
};
