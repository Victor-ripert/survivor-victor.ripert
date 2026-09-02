import { useState } from 'react';
import { LIKERT_MAX, LIKERT_MIN, type CertificationQuestionPublic } from '@profils-actifs/shared';
import type { AnswerState } from './attempt-state.js';

const LIKERT_VALUES = Array.from(
  { length: LIKERT_MAX - LIKERT_MIN + 1 },
  (_, index) => LIKERT_MIN + index,
);

const HELP: Record<CertificationQuestionPublic['type'], string> = {
  MULTIPLE_CHOICE: 'Une seule réponse.',
  CHECKBOX: 'Plusieurs réponses possibles.',
  SHORT_TEXT: 'Quelques lignes suffisent. Cette réponse est lue, pas notée automatiquement.',
  LIKERT_SCALE: `De ${LIKERT_MIN}, pas du tout d'accord, à ${LIKERT_MAX}, tout à fait d'accord.`,
};

interface QuestionCardProps {
  question: CertificationQuestionPublic;
  answer: AnswerState | undefined;
  disabled: boolean;
  onAnswer: (answer: AnswerState) => void;
}

/** One question, rendered for its type. Every choice is a native control
 *  inside a fieldset, so the question text is its accessible group name. */
export const QuestionCard = ({ question, answer, disabled, onAnswer }: QuestionCardProps) => {
  // Keyed by question id in the parent, so a freshly shown SHORT_TEXT
  // question mounts with its own saved text rather than the previous draft.
  const [text, setText] = useState(answer?.textAnswer ?? '');

  const commitText = (): void => {
    const trimmed = text.trim();
    if (trimmed && trimmed !== answer?.textAnswer) onAnswer({ textAnswer: trimmed });
  };

  const legendId = `question-${question.id}`;

  return (
    <fieldset className="stack" disabled={disabled} aria-describedby={`${legendId}-help`}>
      <legend id={legendId} className="question__text">
        {question.text}
      </legend>
      <p id={`${legendId}-help`} className="question__help">
        {question.description ?? HELP[question.type]}
      </p>

      {question.type === 'MULTIPLE_CHOICE' && (
        <div className="option-list">
          {question.options.map((option) => {
            const selected = answer?.optionId === option.id;
            return (
              <label key={option.id} className={`option${selected ? ' option--selected' : ''}`}>
                <input
                  type="radio"
                  name={question.id}
                  value={option.id}
                  checked={selected}
                  onChange={() => onAnswer({ optionId: option.id })}
                />
                <span>{option.text}</span>
              </label>
            );
          })}
        </div>
      )}

      {question.type === 'CHECKBOX' && (
        <div className="option-list">
          {question.options.map((option) => {
            const selectedIds = answer?.optionIds ?? [];
            const selected = selectedIds.includes(option.id);
            return (
              <label key={option.id} className={`option${selected ? ' option--selected' : ''}`}>
                <input
                  type="checkbox"
                  name={question.id}
                  value={option.id}
                  checked={selected}
                  onChange={() =>
                    onAnswer({
                      optionIds: selected
                        ? selectedIds.filter((id) => id !== option.id)
                        : [...selectedIds, option.id],
                    })
                  }
                />
                <span>{option.text}</span>
              </label>
            );
          })}
        </div>
      )}

      {question.type === 'LIKERT_SCALE' && (
        <div>
          <div className="likert" role="group" aria-labelledby={legendId}>
            {LIKERT_VALUES.map((value) => (
              <button
                key={value}
                type="button"
                className="likert__value"
                aria-pressed={answer?.numericAnswer === value}
                onClick={() => onAnswer({ numericAnswer: value })}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="likert__legend" aria-hidden="true">
            <span>Pas du tout d’accord</span>
            <span>Tout à fait d’accord</span>
          </div>
        </div>
      )}

      {question.type === 'SHORT_TEXT' && (
        <div className="field">
          <label className="visually-hidden" htmlFor={`${legendId}-text`}>
            Votre réponse
          </label>
          <textarea
            id={`${legendId}-text`}
            value={text}
            rows={5}
            onChange={(event) => setText(event.target.value)}
            onBlur={commitText}
          />
          <p className="field__hint">
            Enregistrée quand vous quittez le champ ou passez à la suivante.
          </p>
        </div>
      )}
    </fieldset>
  );
};
