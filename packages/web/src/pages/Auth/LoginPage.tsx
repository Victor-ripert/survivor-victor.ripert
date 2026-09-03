import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { FormField } from '../../components/FormField.js';
import { Notice } from '../../components/StatusMessages.js';
import { useAuth } from '../../hooks/useAuth.js';
import { toApiError } from '../../services/api.js';
import { HOME_BY_ROLE } from '../../utils/navigation.js';

interface LocationState {
  from?: string;
}

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
    <form className="card auth-card auth-card--single" onSubmit={submit}>
      <div>
        <h1>Connexion</h1>
        <p className="page-header__subtitle">
          Accédez à votre espace candidat, recruteur ou administrateur.
        </p>
      </div>

      {error && (
        <Notice tone="error">
          <p>{error}</p>
        </Notice>
      )}

      <FormField id="email" label="Adresse e-mail">
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </FormField>

      <FormField id="password" label="Mot de passe">
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </FormField>

      <button type="submit" className="button button--primary button--lg" disabled={isSubmitting}>
        {isSubmitting ? 'Connexion…' : 'Se connecter'}
      </button>

      <p className="auth-card__switch">
        Pas encore de compte ? <Link to="/inscription">Créer un compte</Link>
      </p>
    </form>
  );
};
