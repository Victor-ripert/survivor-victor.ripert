import type { Answer, CertificationQuestionPublic } from '@profils-actifs/shared';

/** What the candidate answered on one question, whatever its type. */
export interface AnswerState {
  optionId?: string;
  optionIds?: string[];
  textAnswer?: string;
  numericAnswer?: number;
}

/** Folds the API's one-row-per-selection answers into one state per question. */
export const toAnswerStates = (answers: Answer[]): Map<string, AnswerState> => {
  const byQuestion = new Map<string, AnswerState>();

  for (const answer of answers) {
    const current = byQuestion.get(answer.questionId) ?? {};

    if (answer.optionId) {
      current.optionIds = [...(current.optionIds ?? []), answer.optionId];
      current.optionId = current.optionId ?? answer.optionId;
    }
    if (answer.textAnswer !== null) current.textAnswer = answer.textAnswer;
    if (answer.numericAnswer !== null) current.numericAnswer = answer.numericAnswer;

    byQuestion.set(answer.questionId, current);
  }

  return byQuestion;
};

export const isAnswered = (
  question: CertificationQuestionPublic,
  state: AnswerState | undefined,
): boolean => {
  if (!state) return false;

  switch (question.type) {
    case 'MULTIPLE_CHOICE':
      return state.optionId !== undefined;
    case 'CHECKBOX':
      return (state.optionIds?.length ?? 0) > 0;
    case 'SHORT_TEXT':
      return (state.textAnswer?.trim().length ?? 0) > 0;
    case 'LIKERT_SCALE':
      return state.numericAnswer !== undefined;
  }
};

/** Where a resumed candidate lands: the first question still unanswered, or
 *  the last one when everything is answered. */
export const firstUnansweredIndex = (
  questions: CertificationQuestionPublic[],
  answers: Map<string, AnswerState>,
): number => {
  const index = questions.findIndex((question) => !isAnswered(question, answers.get(question.id)));
  return index === -1 ? Math.max(questions.length - 1, 0) : index;
};
