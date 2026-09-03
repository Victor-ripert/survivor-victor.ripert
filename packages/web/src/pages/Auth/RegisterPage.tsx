import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { CONSENT_TEXT_VERSION, MIN_APPLICANT_AGE, type UserRole } from '@profils-actifs/shared';
import { useAuth } from '../../hooks/useAuth.js';
import { toApiError } from '../../services/api.js';
import type { RegisterInput } from '../../types/auth.js';

const HOME_BY_ROLE: Record<UserRole, string> = {
  RECRUITER: '/recruteur',
  ADMIN: '/admin',
  APPLICANT: '/',
};

type RegistrableRole = RegisterInput['role'];

const ROLE_LABELS: Record<RegistrableRole, string> = {
  APPLICANT: "Demandeur d'emploi",
  RECRUITER: 'Recruteur',
};

/**
 * Registration screen — one of the three RGAA-audited screens (AD-6), so it
 * ships with real <label>s, native keyboard support and the global
 * :focus-visible ring from the first version rather than a later pass.
 * Carries the age control (birthDate, brief §7.3) and terms acceptance
 * (§7.6) required at sign-up — the separate, video-specific consent record
 * (acceptedAt/consentTextVersion on Video, AD-3) is written when a video is
 * published, not here.
 */
export const RegisterPage = () => {
  const { register, status, user } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [role, setRole] = useState<RegistrableRole>('APPLICANT');
  const [acceptsTerms, setAcceptsTerms] = useState(false);
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
      const signedUp = await register({ firstName, lastName, email, password, birthDate, role });
      navigate(HOME_BY_ROLE[signedUp.role], { replace: true });
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
        <p className="auth-card__hint">Créez votre compte.</p>

        {error && (
          <p className="alert alert--error" role="alert">
            {error}
          </p>
        )}

        <div className="field">
          <label className="field__label" htmlFor="firstName">
            Prénom
          </label>
          <input
            id="firstName"
            type="text"
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="lastName">
            Nom
          </label>
          <input
            id="lastName"
            type="text"
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
          />
        </div>

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
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="birthDate">
            Date de naissance
          </label>
          <input
            id="birthDate"
            type="date"
            autoComplete="bday"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            required
          />
          <p className="field__hint">Vous devez avoir au moins {MIN_APPLICANT_AGE} ans.</p>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="role">
            Je m&apos;inscris en tant que
          </label>
          <select
            id="role"
            value={role}
            onChange={(event) => setRole(event.target.value as RegistrableRole)}
          >
            {(Object.keys(ROLE_LABELS) as RegistrableRole[]).map((value) => (
              <option key={value} value={value}>
                {ROLE_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={acceptsTerms}
            onChange={(event) => setAcceptsTerms(event.target.checked)}
            required
          />
          J&apos;accepte les conditions générales d&apos;utilisation (version {CONSENT_TEXT_VERSION}
          )
        </label>

        <button type="submit" className="button button--primary" disabled={isSubmitting}>
          {isSubmitting ? 'Création du compte…' : 'Créer mon compte'}
        </button>
      </form>
    </main>
  );
};
