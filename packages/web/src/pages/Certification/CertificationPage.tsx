import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  CertificationQuestionPublic,
  CertificationSubmitResult,
} from '@profils-actifs/shared';
import { Icon } from '../../components/Icon.js';
import { ErrorNotice, LoadingRow, Notice } from '../../components/StatusMessages.js';
import { useAsyncResource } from '../../hooks/useAsyncResource.js';
import { toApiError } from '../../services/api.js';
import {
  fetchQuestions,
  saveAnswer,
  startOrResumeAttempt,
  submitAttempt,
  type AttemptSession,
} from '../../services/certification.js';
import { fetchNotifications } from '../../services/notifications.js';
import { pluralize } from '../../utils/format.js';
import {
  firstUnansweredIndex,
  isAnswered,
  toAnswerStates,
  type AnswerState,
} from './attempt-state.js';
import { QuestionCard } from './QuestionCard.js';

type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

const InvalidatedNotice = () => (
  <Notice tone="warning">
    <p>
      <strong>Le questionnaire a été modifié pendant votre passation.</strong> Votre tentative en
      cours a été annulée et ses réponses effacées ; vous pouvez la recommencer depuis le début.
    </p>
  </Notice>
);

interface IntroProps {
  questionCount: number;
  onStart: () => void;
  isStarting: boolean;
  error: string | null;
}

const Intro = ({ questionCount, onStart, isStarting, error }: IntroProps) => (
  <section className="card question">
    <div className="stack">
      <h2>Avant de commencer</h2>
      <p>
        {pluralize(questionCount, 'question')} sur vos aptitudes professionnelles : communication,
        organisation, adaptabilité, travail en équipe… Une seule tentative est ouverte à la fois.
      </p>
      <p>
        Vos réponses sont enregistrées à chaque question, côté serveur : vous pouvez fermer cette
        page et reprendre plus tard exactement où vous en étiez. Le score est calculé à la
        validation et ne change plus ensuite.
      </p>
    </div>
    {error && (
      <Notice tone="error">
        <p>{error}</p>
      </Notice>
    )}
    <div className="actions">
      <button
        type="button"
        className="button button--primary button--lg"
        onClick={onStart}
        disabled={isStarting}
      >
        {isStarting ? 'Ouverture…' : 'Commencer ou reprendre le questionnaire'}
      </button>
    </div>
  </section>
);

interface ResultProps {
  result: CertificationSubmitResult;
}

const Result = ({ result }: ResultProps) => {
  const earned = result.badge.badgeIconUrl !== null;

  return (
    <section className="card question" aria-labelledby="result-title">
      <h2 id="result-title">{earned ? 'Certification obtenue' : 'Questionnaire terminé'}</h2>
      <p className="result-score" aria-label={`Score : ${result.score} sur 100`}>
        {result.score}
        <span className="panel__subtitle"> / 100</span>
      </p>
      <p>
        {earned
          ? `Vous obtenez le badge « ${result.badge.name} ». Il est maintenant visible sur votre profil.`
          : "Le score n'atteint pas le seuil du premier badge. Vous pouvez repasser le questionnaire quand vous le souhaitez."}
      </p>
      <div className="actions">
        <Link className="button button--primary" to="/mon-profil">
          Retour à mon profil
        </Link>
      </div>
    </section>
  );
};

interface QuestionnaireProps {
  questions: CertificationQuestionPublic[];
  session: AttemptSession;
  onInvalidated: () => void;
  onSubmitted: (result: CertificationSubmitResult) => void;
}

const Questionnaire = ({ questions, session, onInvalidated, onSubmitted }: QuestionnaireProps) => {
  const [answers, setAnswers] = useState(() => toAnswerStates(session.attempt.answers));
  const [index, setIndex] = useState(() => firstUnansweredIndex(questions, answers));
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const question = questions[index];
  if (!question) return null;

  const answeredCount = questions.filter((entry) =>
    isAnswered(entry, answers.get(entry.id)),
  ).length;
  const isLast = index === questions.length - 1;
  const current = answers.get(question.id);

  const persist = async (next: AnswerState): Promise<void> => {
    setAnswers((existing) => new Map(existing).set(question.id, next));
    setSaveState('saving');
    setError(null);

    try {
      await saveAnswer(session.attempt.id, { questionId: question.id, ...next });
      setSaveState('saved');
    } catch (cause: unknown) {
      const apiError = toApiError(cause);
      if (apiError.status === 409) {
        onInvalidated();
        return;
      }
      setSaveState('failed');
      setError(apiError.message);
    }
  };

  const submit = async (): Promise<void> => {
    setIsSubmitting(true);
    setError(null);

    try {
      onSubmitted(await submitAttempt(session.attempt.id));
    } catch (cause: unknown) {
      const apiError = toApiError(cause);
      if (apiError.status === 409) {
        onInvalidated();
        return;
      }
      setError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="stack stack--loose">
      <div className="question-progress">
        <div className="question-progress__row">
          <h1>Certification JEB</h1>
          <p className="question-progress__count">
            <strong>Question {index + 1}</strong> sur {questions.length} ·{' '}
            {pluralize(answeredCount, 'réponse enregistrée', 'réponses enregistrées')}
          </p>
        </div>
        <div
          className="progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={answeredCount}
          aria-label="Progression"
        >
          <span
            className="progress__fill"
            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {session.resumed && index > 0 && (
        <Notice tone="info">
          <p>
            Reprise de votre passation : vous reprenez à la première question sans réponse. Vos
            réponses précédentes sont conservées.
          </p>
        </Notice>
      )}

      {error && (
        <Notice tone="error">
          <p>{error}</p>
        </Notice>
      )}

      <section className="card question">
        <QuestionCard
          key={question.id}
          question={question}
          answer={current}
          disabled={isSubmitting}
          onAnswer={(next) => void persist(next)}
        />

        <div className="question__footer">
          <button
            type="button"
            className="button"
            onClick={() => setIndex((value) => Math.max(value - 1, 0))}
            disabled={index === 0 || isSubmitting}
          >
            <Icon name="arrow-left" />
            Précédente
          </button>

          <p className="save-state" role="status">
            {saveState === 'saving' && 'Enregistrement…'}
            {saveState === 'saved' && (
              <>
                <Icon name="check" size={14} strokeWidth={3} />
                Réponse enregistrée
              </>
            )}
            {saveState === 'failed' && 'Réponse non enregistrée'}
          </p>

          {isLast ? (
            <button
              type="button"
              className="button button--primary"
              onClick={() => void submit()}
              disabled={isSubmitting || answeredCount === 0}
            >
              {isSubmitting ? 'Calcul du score…' : 'Valider mes réponses'}
            </button>
          ) : (
            <button
              type="button"
              className="button button--primary"
              onClick={() => setIndex((value) => Math.min(value + 1, questions.length - 1))}
              disabled={isSubmitting}
            >
              Suivante
              <Icon name="arrow-right" />
            </button>
          )}
        </div>
      </section>
    </div>
  );
};

/**
 * The questionnaire, save-and-resume included (brief §8.4): every answer is
 * written to the API as it is given, nothing lives in browser storage, and a
 * 409 on save means an administrator edited a question mid-session — the
 * attempt was invalidated and the candidate is told (agreed on 2 September).
 */
export const CertificationPage = () => {
  const loadQuestions = useCallback((signal: AbortSignal) => fetchQuestions(signal), []);
  const questions = useAsyncResource(loadQuestions);

  const loadNotifications = useCallback((signal: AbortSignal) => fetchNotifications(1, signal), []);
  const notifications = useAsyncResource(loadNotifications);

  const [session, setSession] = useState<AttemptSession | null>(null);
  const [result, setResult] = useState<CertificationSubmitResult | null>(null);
  const [invalidated, setInvalidated] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const wasInvalidated =
    invalidated ||
    (notifications.data?.data.some(
      (notification) =>
        notification.type === 'CERTIFICATION_ATTEMPT_INVALIDATED' && !notification.isRead,
    ) ??
      false);

  const start = async (): Promise<void> => {
    setIsStarting(true);
    setStartError(null);
    setInvalidated(false);

    try {
      setSession(await startOrResumeAttempt());
    } catch (cause: unknown) {
      setStartError(toApiError(cause).message);
    } finally {
      setIsStarting(false);
    }
  };

  if (questions.isLoading && !questions.data)
    return <LoadingRow label="Chargement du questionnaire…" />;
  if (questions.error) return <ErrorNotice error={questions.error} onRetry={questions.reload} />;
  if (!questions.data) return null;

  if (result) {
    return (
      <div className="page-narrow stack stack--loose">
        <Result result={result} />
      </div>
    );
  }

  if (session && !invalidated) {
    return (
      <div className="page-narrow">
        <Questionnaire
          questions={questions.data}
          session={session}
          onInvalidated={() => {
            setSession(null);
            setInvalidated(true);
          }}
          onSubmitted={setResult}
        />
      </div>
    );
  }

  return (
    <div className="page-narrow stack stack--loose">
      <header className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1>Certification JEB</h1>
          <p className="page-header__subtitle">
            Le questionnaire d’aptitudes qui délivre le badge affiché sur votre profil.
          </p>
        </div>
      </header>
      {wasInvalidated && <InvalidatedNotice />}
      <Intro
        questionCount={questions.data.length}
        onStart={() => void start()}
        isStarting={isStarting}
        error={startError}
      />
    </div>
  );
};
