import { scoreAttempt, type ScoringQuestion } from '../src/services/certification/scoring.js';

const mcQuestion: ScoringQuestion = {
  id: 'mc-1',
  type: 'MULTIPLE_CHOICE',
  weight: 2,
  maxPoints: 10,
  options: [
    { id: 'opt-bad', points: 0 },
    { id: 'opt-mid', points: 5 },
    { id: 'opt-best', points: 10 },
  ],
};

const checkboxQuestion: ScoringQuestion = {
  id: 'checkbox-1',
  type: 'CHECKBOX',
  weight: 1,
  maxPoints: 10,
  options: [
    { id: 'cb-a', points: 4 },
    { id: 'cb-b', points: 4 },
    { id: 'cb-c', points: 4 }, // sum of all three (12) exceeds maxPoints on purpose
  ],
};

const likertQuestion: ScoringQuestion = {
  id: 'likert-1',
  type: 'LIKERT_SCALE',
  weight: 1,
  maxPoints: 10,
  options: [],
};

const shortTextQuestion: ScoringQuestion = {
  id: 'text-1',
  type: 'SHORT_TEXT',
  weight: 3, // deliberately heavy weight — must still contribute nothing
  maxPoints: 5,
  options: [],
};

describe('scoreAttempt — overall score', () => {
  it('returns 0 for an empty questions list', () => {
    expect(scoreAttempt([], [])).toEqual({ totalScore: 0, questionScores: [] });
  });

  it('returns 0 when nothing was answered', () => {
    const result = scoreAttempt([mcQuestion, checkboxQuestion, likertQuestion], []);
    expect(result.totalScore).toBe(0);
  });

  it('returns 100 for a perfect run', () => {
    const result = scoreAttempt(
      [mcQuestion, checkboxQuestion, likertQuestion],
      [
        { questionId: 'mc-1', optionId: 'opt-best' },
        // all three CHECKBOX options: 4+4+4=12, capped at maxPoints (10) — see the CHECKBOX describe block below
        { questionId: 'checkbox-1', optionId: 'cb-a' },
        { questionId: 'checkbox-1', optionId: 'cb-b' },
        { questionId: 'checkbox-1', optionId: 'cb-c' },
        { questionId: 'likert-1', numericAnswer: 5 },
      ],
    );
    expect(result.totalScore).toBe(100);
  });

  it('an unanswered question still counts toward the denominator', () => {
    // mc-1 perfect, checkbox-1 and likert-1 left blank
    const result = scoreAttempt(
      [mcQuestion, checkboxQuestion, likertQuestion],
      [{ questionId: 'mc-1', optionId: 'opt-best' }],
    );
    // weighted earned = 10*2 = 20, weighted max = 10*2 + 10*1 + 10*1 = 40 -> 50
    expect(result.totalScore).toBe(50);
  });

  it('weight makes a heavier question matter more than a lighter one', () => {
    const lightWrong = scoreAttempt(
      [mcQuestion, likertQuestion], // mc weight 2, likert weight 1
      [
        { questionId: 'mc-1', optionId: 'opt-bad' },
        { questionId: 'likert-1', numericAnswer: 5 },
      ],
    );
    const heavyWrong = scoreAttempt(
      [mcQuestion, likertQuestion],
      [
        { questionId: 'mc-1', optionId: 'opt-best' },
        { questionId: 'likert-1', numericAnswer: 1 },
      ],
    );
    // Missing the heavier (weight 2) question hurts more than missing the lighter one.
    expect(lightWrong.totalScore).toBeLessThan(heavyWrong.totalScore);
  });
});

describe('scoreAttempt — SHORT_TEXT exclusion', () => {
  it('is excluded from both numerator and denominator, marked scored: false', () => {
    const withUnansweredText = scoreAttempt(
      [mcQuestion, shortTextQuestion],
      [{ questionId: 'mc-1', optionId: 'opt-best' }],
    );
    const withoutTextQuestion = scoreAttempt(
      [mcQuestion],
      [{ questionId: 'mc-1', optionId: 'opt-best' }],
    );

    expect(withUnansweredText.totalScore).toBe(withoutTextQuestion.totalScore);
    expect(withUnansweredText.totalScore).toBe(100);

    const textScore = withUnansweredText.questionScores.find((q) => q.questionId === 'text-1');
    expect(textScore).toEqual({
      questionId: 'text-1',
      scored: false,
      pointsEarned: 0,
      weightedPoints: 0,
    });
  });
});

describe('scoreAttempt — MULTIPLE_CHOICE', () => {
  it('awards the selected option points, 0 if unanswered', () => {
    const mid = scoreAttempt([mcQuestion], [{ questionId: 'mc-1', optionId: 'opt-mid' }]);
    expect(mid.questionScores[0]!.pointsEarned).toBe(5);

    const none = scoreAttempt([mcQuestion], []);
    expect(none.questionScores[0]!.pointsEarned).toBe(0);
  });
});

describe('scoreAttempt — CHECKBOX', () => {
  it('sums points across all selected options', () => {
    const result = scoreAttempt(
      [checkboxQuestion],
      [
        { questionId: 'checkbox-1', optionId: 'cb-a' },
        { questionId: 'checkbox-1', optionId: 'cb-b' },
      ],
    );
    expect(result.questionScores[0]!.pointsEarned).toBe(8);
  });

  it('caps the total at maxPoints when selected options overflow it', () => {
    const result = scoreAttempt(
      [checkboxQuestion],
      [
        { questionId: 'checkbox-1', optionId: 'cb-a' },
        { questionId: 'checkbox-1', optionId: 'cb-b' },
        { questionId: 'checkbox-1', optionId: 'cb-c' },
      ],
    );
    // 4+4+4 = 12, capped at maxPoints (10)
    expect(result.questionScores[0]!.pointsEarned).toBe(10);
  });
});

describe('scoreAttempt — LIKERT_SCALE', () => {
  it.each([
    [1, 0],
    [3, 5],
    [5, 10],
  ])(
    'maps numericAnswer %i to %i points on a 0-10 maxPoints scale',
    (numericAnswer, expectedPoints) => {
      const result = scoreAttempt([likertQuestion], [{ questionId: 'likert-1', numericAnswer }]);
      expect(result.questionScores[0]!.pointsEarned).toBe(expectedPoints);
    },
  );

  it('awards 0 when unanswered', () => {
    const result = scoreAttempt([likertQuestion], []);
    expect(result.questionScores[0]!.pointsEarned).toBe(0);
  });
});
