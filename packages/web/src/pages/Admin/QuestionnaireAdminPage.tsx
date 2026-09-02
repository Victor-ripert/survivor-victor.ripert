import { useCallback, useState, type FormEvent } from 'react';
import type { CertificationQuestion } from '@profils-actifs/shared';
import { FormField } from '../../components/FormField.js';
import { ErrorNotice, LoadingRow, Notice } from '../../components/StatusMessages.js';
import { useAsyncResource } from '../../hooks/useAsyncResource.js';
import { toApiError } from '../../services/api.js';
import { fetchAdminQuestions, updateQuestion } from '../../services/certification.js';
import { pluralize } from '../../utils/format.js';

const TYPE_LABELS: Record<CertificationQuestion['type'], string> = {
  MULTIPLE_CHOICE: 'Choix unique',
  CHECKBOX: 'Choix multiples',
  SHORT_TEXT: 'Texte libre',
  LIKERT_SCALE: 'Échelle 1 à 5',
};

interface QuestionRowProps {
  question: CertificationQuestion;
  onSaved: (question: CertificationQuestion) => void;
}

const QuestionRow = ({ question, onSaved }: QuestionRowProps) => {
  const [weight, setWeight] = useState(String(question.weight));
  const [maxPoints, setMaxPoints] = useState(String(question.maxPoints));
  const [isActive, setIsActive] = useState(question.isActive);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isDirty =
    Number(weight) !== question.weight ||
    Number(maxPoints) !== question.maxPoints ||
    isActive !== question.isActive;

  const save = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      onSaved(
        await updateQuestion(question.id, {
          weight: Number(weight),
          maxPoints: Number(maxPoints),
          isActive,
        }),
      );
    } catch (cause: unknown) {
      setError(toApiError(cause).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <li className="card card--flat question-admin">
      <span className="question-admin__order" aria-label={`Question ${question.order}`}>
        {question.order}
      </span>
      <div className="stack" style={{ gap: 'var(--space-2)' }}>
        <p className="question-admin__text">{question.text}</p>
        <p className="meta">
          <span>{TYPE_LABELS[question.type]}</span>
          {!question.isActive && (
            <>
              <span aria-hidden="true">·</span>
              <span className="badge">Inactive</span>
            </>
          )}
        </p>
        {question.options.length > 0 && (
          <ul className="question-admin__options" aria-label="Options et points">
            {question.options.map((option) => (
              <li key={option.id}>
                {option.text} — {pluralize(option.points, 'point')}
              </li>
            ))}
          </ul>
        )}
        {error && (
          <Notice tone="error">
            <p>{error}</p>
          </Notice>
        )}
      </div>
      <form className="question-admin__edit" onSubmit={(event) => void save(event)}>
        <FormField id={`weight-${question.id}`} label="Poids">
          <input
            type="number"
            min={1}
            step={1}
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
          />
        </FormField>
        <FormField id={`max-${question.id}`} label="Points max">
          <input
            type="number"
            min={1}
            step={1}
            value={maxPoints}
            onChange={(event) => setMaxPoints(event.target.value)}
          />
        </FormField>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          Active
        </label>
        <button type="submit" className="button" disabled={!isDirty || isSaving}>
          {isSaving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </li>
  );
};

/** The questionnaire's scoring key, admin only. Editing an active question
 *  invalidates every attempt in progress (agreed with the digital advisor on
 *  2 September), so the page says so before any change. */
export const QuestionnaireAdminPage = () => {
  const load = useCallback((signal: AbortSignal) => fetchAdminQuestions(signal), []);
  const { data, error, isLoading, reload } = useAsyncResource(load);
  const [saved, setSaved] = useState<Record<string, CertificationQuestion>>({});

  if (isLoading && !data) return <LoadingRow label="Chargement des questions…" />;
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return null;

  const questions = data.map((question) => saved[question.id] ?? question);
  const activeCount = questions.filter((question) => question.isActive).length;

  return (
    <div className="page-reading stack stack--loose">
      <header className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1>Questionnaire de certification</h1>
          <p className="page-header__subtitle">
            {pluralize(activeCount, 'question active', 'questions actives')} sur {questions.length}.
            Les points et les poids ne sont jamais envoyés aux candidats.
          </p>
        </div>
      </header>

      <Notice tone="warning">
        <p>
          <strong>Modifier une question active annule toutes les passations en cours</strong> :
          leurs réponses sont effacées et chaque candidat concerné est prévenu. Une question
          désactivée ne compte plus dans le score.
        </p>
      </Notice>

      <ul className="stack" style={{ listStyle: 'none' }}>
        {questions.map((question) => (
          <QuestionRow
            key={question.id}
            question={question}
            onSaved={(next) => setSaved((current) => ({ ...current, [next.id]: next }))}
          />
        ))}
      </ul>
    </div>
  );
};
