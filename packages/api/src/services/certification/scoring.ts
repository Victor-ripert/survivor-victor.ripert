import { LIKERT_MIN, LIKERT_MAX } from '../../validators/certification.js';

// Deliberately Prisma-free — takes plain data in, returns a plain result.
// Whoever calls this (the /submit endpoint, ticket #15) is responsible for
// fetching questions/answers first and shaping them into these types.

export type ScoringQuestionType = 'MULTIPLE_CHOICE' | 'SHORT_TEXT' | 'CHECKBOX' | 'LIKERT_SCALE';

export interface ScoringOption {
  id: string;
  points: number;
}

export interface ScoringQuestion {
  id: string;
  type: ScoringQuestionType;
  weight: number;
  maxPoints: number;
  options: ScoringOption[]; // empty for SHORT_TEXT / LIKERT_SCALE
}

export interface ScoringAnswer {
  questionId: string;
  optionId?: string | null;
  textAnswer?: string | null;
  numericAnswer?: number | null;
}

export interface QuestionScore {
  questionId: string;
  // false for SHORT_TEXT: no automated grading exists for free text, so it's
  // excluded from both the numerator and the denominator entirely — it does
  // not silently count as 0 (which would just penalize answering it).
  scored: boolean;
  pointsEarned: number;
  weightedPoints: number;
}

export interface ScoringResult {
  totalScore: number; // 0-100
  questionScores: QuestionScore[];
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const computeRawPoints = (question: ScoringQuestion, answers: ScoringAnswer[]): number => {
  switch (question.type) {
    case 'SHORT_TEXT':
      // Unreachable: scoreAttempt() filters SHORT_TEXT questions out before
      // calling this. Kept as an explicit case for switch exhaustiveness.
      return 0;
    case 'MULTIPLE_CHOICE': {
      const optionId = answers[0]?.optionId;
      if (!optionId) return 0;
      return question.options.find((option) => option.id === optionId)?.points ?? 0;
    }
    case 'CHECKBOX': {
      const selectedIds = new Set(answers.map((answer) => answer.optionId).filter((id): id is string => Boolean(id)));
      const raw = question.options
        .filter((option) => selectedIds.has(option.id))
        .reduce((sum, option) => sum + option.points, 0);
      // Capped at maxPoints in case an admin's per-option pondération sums
      // above it — selecting everything should never exceed the ceiling.
      return Math.min(raw, question.maxPoints);
    }
    case 'LIKERT_SCALE': {
      const numericAnswer = answers[0]?.numericAnswer;
      if (numericAnswer == null) return 0;
      // Linear: LIKERT_MIN -> 0 points, LIKERT_MAX -> maxPoints.
      const ratio = (numericAnswer - LIKERT_MIN) / (LIKERT_MAX - LIKERT_MIN);
      return Math.round(clamp(ratio, 0, 1) * question.maxPoints);
    }
  }
};

export const scoreAttempt = (questions: ScoringQuestion[], answers: ScoringAnswer[]): ScoringResult => {
  const answersByQuestion = new Map<string, ScoringAnswer[]>();
  for (const answer of answers) {
    const list = answersByQuestion.get(answer.questionId) ?? [];
    list.push(answer);
    answersByQuestion.set(answer.questionId, list);
  }

  let weightedEarnedTotal = 0;
  let weightedMaxTotal = 0;
  const questionScores: QuestionScore[] = [];

  for (const question of questions) {
    if (question.type === 'SHORT_TEXT') {
      questionScores.push({ questionId: question.id, scored: false, pointsEarned: 0, weightedPoints: 0 });
      continue;
    }

    // An unanswered question earns 0 but its weighted maxPoints still counts
    // toward the denominator — abandoning questions must not inflate the score.
    const questionAnswers = answersByQuestion.get(question.id) ?? [];
    const pointsEarned = computeRawPoints(question, questionAnswers);
    const weightedPoints = pointsEarned * question.weight;

    questionScores.push({ questionId: question.id, scored: true, pointsEarned, weightedPoints });
    weightedEarnedTotal += weightedPoints;
    weightedMaxTotal += question.maxPoints * question.weight;
  }

  const totalScore = weightedMaxTotal === 0 ? 0 : Math.round((weightedEarnedTotal / weightedMaxTotal) * 100);

  return { totalScore: clamp(totalScore, 0, 100), questionScores };
};
