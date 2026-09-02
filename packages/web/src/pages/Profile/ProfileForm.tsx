import { useState, type ChangeEvent, type FormEvent } from 'react';
import { PROFILE_BIO_MAX_LENGTH, type Profile } from '@profils-actifs/shared';
import { FormField } from '../../components/FormField.js';
import { Notice } from '../../components/StatusMessages.js';
import { useFormErrors } from '../../hooks/useFormErrors.js';
import { toApiError } from '../../services/api.js';
import { saveOwnProfile } from '../../services/profiles.js';
import { EMPTY_PROFILE_FORM, profileFormSchema, type ProfileFormValues } from './profile-form.js';

type Field = keyof ProfileFormValues;

const toFormValues = (profile: Profile | null): ProfileFormValues =>
  profile
    ? {
        headline: profile.headline ?? '',
        bio: profile.bio ?? '',
        location: profile.location,
        sector: profile.sector,
      }
    : EMPTY_PROFILE_FORM;

interface ProfileFormProps {
  profile: Profile | null;
  onSaved: (profile: Profile) => void;
}

export const ProfileForm = ({ profile, onSaved }: ProfileFormProps) => {
  const [form, setForm] = useState<ProfileFormValues>(() => toFormValues(profile));
  const { errors, fromZod, clear } = useFormErrors<Field>();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const update =
    (field: Field) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      const { value } = event.target;
      setForm((current) => ({ ...current, [field]: value }));
      clear(field);
      setSaved(false);
      setSaveError(null);
    };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const parsed = profileFormSchema.safeParse(form);
    if (!parsed.success) {
      fromZod(parsed.error);
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const next = await saveOwnProfile(parsed.data);
      setForm(toFormValues(next));
      setSaved(true);
      onSaved(next);
    } catch (cause: unknown) {
      setSaveError(toApiError(cause).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="card panel" onSubmit={submit} noValidate aria-labelledby="profile-form-title">
      <h2 id="profile-form-title" className="panel__title">
        Informations
      </h2>

      {saveError && (
        <Notice tone="error">
          <p>{saveError}</p>
        </Notice>
      )}
      {saved && (
        <Notice tone="success">
          <p>Profil enregistré.</p>
        </Notice>
      )}

      <FormField
        id="headline"
        label="Titre"
        hint="Le métier ou le poste visé, en une ligne."
        error={errors.headline}
        optional
      >
        <input type="text" value={form.headline} onChange={update('headline')} />
      </FormField>

      <div className="form-grid">
        <FormField id="sector" label="Secteur" error={errors.sector}>
          <input type="text" value={form.sector} onChange={update('sector')} required />
        </FormField>
        <FormField id="location" label="Localisation" error={errors.location}>
          <input type="text" value={form.location} onChange={update('location')} required />
        </FormField>
      </div>

      <FormField
        id="bio"
        label="Présentation"
        hint={`${form.bio.length} / ${PROFILE_BIO_MAX_LENGTH} caractères`}
        error={errors.bio}
        optional
      >
        <textarea value={form.bio} onChange={update('bio')} rows={5} />
      </FormField>

      <div className="actions actions--end">
        <button type="submit" className="button button--primary" disabled={isSaving}>
          {isSaving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
};
