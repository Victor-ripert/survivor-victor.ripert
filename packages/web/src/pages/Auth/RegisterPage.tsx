import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ADULT_AGE, MIN_APPLICANT_AGE, PASSWORD_MIN_LENGTH } from '@profils-actifs/shared';
import { FormField } from '../../components/FormField.js';
import { Icon } from '../../components/Icon.js';
import { Notice } from '../../components/StatusMessages.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useFormErrors } from '../../hooks/useFormErrors.js';
import { toApiError } from '../../services/api.js';
import { HOME_BY_ROLE } from '../../utils/navigation.js';
import {
  EMPTY_REGISTER_FORM,
  registerFormSchema,
  type RegisterFormValues,
} from './register-form.js';

type Field = keyof RegisterFormValues;

/** One of the three screens the accessibility audit covers (brief §7.4):
 *  every control is labelled, reachable by keyboard and reports its error
 *  through `aria-describedby`. */
export const RegisterPage = () => {
  const { register, status, user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<RegisterFormValues>(EMPTY_REGISTER_FORM);
  const { errors, fromZod, clear } = useFormErrors<Field>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (status === 'authenticated' && user) {
    return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  }

  const isApplicant = form.role === 'APPLICANT';

  const update =
    (field: Field) =>
    (event: ChangeEvent<HTMLInputElement>): void => {
      const { value } = event.target;
      setForm((current) => ({ ...current, [field]: value }));
      clear(field);
      setSubmitError(null);
    };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const parsed = registerFormSchema.safeParse(form);
    if (!parsed.success) {
      fromZod(parsed.error);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const { birthDate, ...rest } = parsed.data;
      const created = await register(rest.role === 'APPLICANT' ? { ...rest, birthDate } : rest);
      navigate(HOME_BY_ROLE[created.role], { replace: true });
    } catch (cause: unknown) {
      setSubmitError(toApiError(cause).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-intro">
        <h1>Créer un compte</h1>
        <p className="auth-intro__lead">
          Un candidat publie un profil et une vidéo de présentation, puis passe le questionnaire de
          certification. Un recruteur consulte le catalogue et prend contact.
        </p>
        <ol className="steps">
          <li>
            <span className="steps__number" aria-hidden="true">
              1
            </span>
            <span>
              <strong>Votre profil</strong> — secteur, localisation et compétences, relu par un
              administrateur avant publication.
            </span>
          </li>
          <li>
            <span className="steps__number" aria-hidden="true">
              2
            </span>
            <span>
              <strong>Votre vidéo</strong> — un lien YouTube ou Vimeo, avec votre consentement
              explicite, validé avant d’être visible.
            </span>
          </li>
          <li>
            <span className="steps__number" aria-hidden="true">
              3
            </span>
            <span>
              <strong>La certification JEB</strong> — 100 questions, reprise possible à tout moment,
              badge affiché sur votre profil.
            </span>
          </li>
        </ol>
        <Notice tone="info">
          <p>
            Vos données servent uniquement à la mise en relation professionnelle. Aucune donnée
            n’est vendue ni transmise hors de la plateforme.
          </p>
        </Notice>
      </section>

      <form className="card auth-card" onSubmit={submit} noValidate>
        <fieldset>
          <legend className="field__label" style={{ marginBottom: 'var(--space-2)' }}>
            Je suis
          </legend>
          <div className="choice-group">
            <label className={`choice${isApplicant ? ' choice--selected' : ''}`}>
              <input
                type="radio"
                name="role"
                value="APPLICANT"
                checked={isApplicant}
                onChange={update('role')}
              />
              Candidat·e
            </label>
            <label className={`choice${isApplicant ? '' : ' choice--selected'}`}>
              <input
                type="radio"
                name="role"
                value="RECRUITER"
                checked={!isApplicant}
                onChange={update('role')}
              />
              Recruteur·se
            </label>
          </div>
        </fieldset>

        {submitError && (
          <Notice tone="error">
            <p>{submitError}</p>
          </Notice>
        )}

        <div className="form-grid">
          <FormField id="firstName" label="Prénom" error={errors.firstName}>
            <input
              type="text"
              autoComplete="given-name"
              value={form.firstName}
              onChange={update('firstName')}
              required
            />
          </FormField>
          <FormField id="lastName" label="Nom" error={errors.lastName}>
            <input
              type="text"
              autoComplete="family-name"
              value={form.lastName}
              onChange={update('lastName')}
              required
            />
          </FormField>
        </div>

        <FormField id="email" label="Adresse e-mail" error={errors.email}>
          <input
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={update('email')}
            required
          />
        </FormField>

        <FormField
          id="password"
          label="Mot de passe"
          hint={`${PASSWORD_MIN_LENGTH} caractères minimum.`}
          error={errors.password}
        >
          <input
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={update('password')}
            required
          />
        </FormField>

        {isApplicant && (
          <FormField
            id="birthDate"
            label="Date de naissance"
            error={errors.birthDate}
            hint={`Inscription à partir de ${MIN_APPLICANT_AGE} ans. Entre ${MIN_APPLICANT_AGE} et ${ADULT_AGE} ans, votre profil reste réservé aux recruteurs connectés : il n'apparaît pas sur le fil public.`}
          >
            <input
              type="date"
              autoComplete="bday"
              value={form.birthDate}
              onChange={update('birthDate')}
              required
            />
          </FormField>
        )}

        <button type="submit" className="button button--primary button--lg" disabled={isSubmitting}>
          {isSubmitting ? 'Création…' : 'Créer mon compte'}
        </button>

        <p className="auth-card__switch">
          Déjà inscrit·e ? <Link to="/connexion">Se connecter</Link>
        </p>
        <p className="field__hint">
          <Icon name="info" size={14} /> Aucune condition générale n’est publiée pour l’instant : le
          projet est en cours de relecture juridique.
        </p>
      </form>
    </div>
  );
};
