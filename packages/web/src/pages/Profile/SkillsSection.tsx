import { useCallback, useState, type FormEvent } from 'react';
import { SKILL_LEVELS, type Profile, type SkillLevel } from '@profils-actifs/shared';
import { FormField } from '../../components/FormField.js';
import { Icon } from '../../components/Icon.js';
import { Notice } from '../../components/StatusMessages.js';
import { useAsyncResource } from '../../hooks/useAsyncResource.js';
import { toApiError } from '../../services/api.js';
import { addOwnSkill, fetchSkills, removeOwnSkill } from '../../services/profiles.js';
import { SKILL_LEVEL_LABELS } from '../../utils/format.js';

const SKILL_LIST_ID = 'skill-suggestions';

interface SkillsSectionProps {
  profile: Profile | null;
  onChanged: (profile: Profile) => void;
}

export const SkillsSection = ({ profile, onChanged }: SkillsSectionProps) => {
  const [skillName, setSkillName] = useState('');
  const [level, setLevel] = useState<SkillLevel>('INTERMEDIATE');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const loadSuggestions = useCallback((signal: AbortSignal) => fetchSkills(signal), []);
  const { data: suggestions } = useAsyncResource(loadSuggestions);

  const add = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!skillName.trim()) {
      setError('Indiquez une compétence.');
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      onChanged(await addOwnSkill({ skillName: skillName.trim(), level }));
      setSkillName('');
    } catch (cause: unknown) {
      setError(toApiError(cause).message);
    } finally {
      setIsBusy(false);
    }
  };

  const remove = async (skillId: string): Promise<void> => {
    if (!profile) return;

    setIsBusy(true);
    setError(null);

    try {
      await removeOwnSkill(skillId);
      onChanged({
        ...profile,
        skills: profile.skills.filter((skill) => skill.skillId !== skillId),
      });
    } catch (cause: unknown) {
      setError(toApiError(cause).message);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className="card panel" aria-labelledby="skills-title">
      <div>
        <h2 id="skills-title" className="panel__title">
          Compétences
        </h2>
        <p className="panel__subtitle">Ce sur quoi les recruteurs filtrent le catalogue.</p>
      </div>

      {!profile ? (
        <p className="panel__subtitle">
          Enregistrez d’abord votre profil pour ajouter des compétences.
        </p>
      ) : (
        <>
          {error && (
            <Notice tone="error">
              <p>{error}</p>
            </Notice>
          )}

          {profile.skills.length === 0 ? (
            <p className="panel__subtitle">Aucune compétence renseignée pour le moment.</p>
          ) : (
            <ul className="chip-list" aria-label="Vos compétences">
              {profile.skills.map((skill) => (
                <li className="chip chip--removable" key={skill.id}>
                  <span>
                    <strong>{skill.skillName}</strong> · {SKILL_LEVEL_LABELS[skill.level]}
                  </span>
                  <button
                    type="button"
                    className="chip__remove"
                    aria-label={`Retirer ${skill.skillName}`}
                    disabled={isBusy}
                    onClick={() => void remove(skill.skillId)}
                  >
                    <Icon name="close" size={12} strokeWidth={3} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form className="skill-form" onSubmit={(event) => void add(event)}>
            <FormField id="skill-name" label="Compétence">
              <input
                type="text"
                list={SKILL_LIST_ID}
                placeholder="SQL, Anglais…"
                value={skillName}
                onChange={(event) => setSkillName(event.target.value)}
                autoComplete="off"
              />
            </FormField>
            <datalist id={SKILL_LIST_ID}>
              {suggestions?.map((skill) => (
                <option key={skill.id} value={skill.name} />
              ))}
            </datalist>
            <FormField id="skill-level" label="Niveau">
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value as SkillLevel)}
              >
                {SKILL_LEVELS.map((value) => (
                  <option key={value} value={value}>
                    {SKILL_LEVEL_LABELS[value]}
                  </option>
                ))}
              </select>
            </FormField>
            <button type="submit" className="button" disabled={isBusy}>
              Ajouter
            </button>
          </form>
        </>
      )}
    </section>
  );
};
