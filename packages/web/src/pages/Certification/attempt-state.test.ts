import type { CertificationQuestionPublic } from '@profils-actifs/shared';
import { firstUnansweredIndex, isAnswered, toAnswerStates } from './attempt-state.js';

const question = (
  id: string,
  type: CertificationQuestionPublic['type'],
): CertificationQuestionPublic => ({
  id,
  order: 1,
  type,
  text: id,
  description: null,
  options: [],
});

const answer = (
  questionId: string,
  fields: Partial<{ optionId: string; textAnswer: string; numericAnswer: number }>,
) => ({
  id: `${questionId}-answer`,
  attemptId: 'attempt-1',
  questionId,
  optionId: fields.optionId ?? null,
  textAnswer: fields.textAnswer ?? null,
  numericAnswer: fields.numericAnswer ?? null,
});

describe('toAnswerStates', () => {
  it('folds the one-row-per-option CHECKBOX answers into one state', () => {
    const states = toAnswerStates([
      answer('q1', { optionId: 'a' }),
      answer('q1', { optionId: 'b' }),
      answer('q2', { numericAnswer: 4 }),
    ]);

    expect(states.get('q1')).toEqual({ optionId: 'a', optionIds: ['a', 'b'] });
    expect(states.get('q2')).toEqual({ numericAnswer: 4 });
  });
});

describe('isAnswered', () => {
  it('judges each question type on its own field', () => {
    expect(isAnswered(question('q', 'MULTIPLE_CHOICE'), { optionId: 'a' })).toBe(true);
    expect(isAnswered(question('q', 'CHECKBOX'), { optionIds: [] })).toBe(false);
    expect(isAnswered(question('q', 'SHORT_TEXT'), { textAnswer: '   ' })).toBe(false);
    expect(isAnswered(question('q', 'LIKERT_SCALE'), { numericAnswer: 3 })).toBe(true);
    expect(isAnswered(question('q', 'LIKERT_SCALE'), undefined)).toBe(false);
  });
});

describe('firstUnansweredIndex', () => {
  const questions = [
    question('q1', 'MULTIPLE_CHOICE'),
    question('q2', 'LIKERT_SCALE'),
    question('q3', 'SHORT_TEXT'),
  ];

  it('resumes on the first question without an answer', () => {
    const states = toAnswerStates([answer('q1', { optionId: 'a' })]);
    expect(firstUnansweredIndex(questions, states)).toBe(1);
  });

  it('lands on the last question when everything is answered', () => {
    const states = toAnswerStates([
      answer('q1', { optionId: 'a' }),
      answer('q2', { numericAnswer: 2 }),
      answer('q3', { textAnswer: 'done' }),
    ]);
    expect(firstUnansweredIndex(questions, states)).toBe(2);
  });
});
