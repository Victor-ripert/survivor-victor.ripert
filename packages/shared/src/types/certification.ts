/**
 * Wire format of the certification questionnaire (Domain C). Two shapes of
 * question exist on purpose: the candidate-facing one never carries points,
 * weights or the active flag, or the scoring key would be readable from the
 * browser's network tab.
 */

export const QUESTION_TYPES = [
  'MULTIPLE_CHOICE',
  'SHORT_TEXT',
  'CHECKBOX',
  'LIKERT_SCALE',
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const ATTEMPT_STATUSES = ['IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'EXPIRED'] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

export const LIKERT_MIN = 1;
export const LIKERT_MAX = 5;

export interface CertificationOptionPublic {
  id: string;
  text: string;
  order: number;
}

export interface CertificationQuestionPublic {
  id: string;
  order: number;
  type: QuestionType;
  text: string;
  description: string | null;
  options: CertificationOptionPublic[];
}

export interface CertificationOption extends CertificationOptionPublic {
  points: number;
}

export interface CertificationQuestion extends Omit<CertificationQuestionPublic, 'options'> {
  weight: number;
  maxPoints: number;
  isActive: boolean;
  options: CertificationOption[];
}

/** One saved answer. `pointsEarned` is only present once the attempt is closed. */
export interface Answer {
  id: string;
  attemptId: string;
  questionId: string;
  optionId: string | null;
  textAnswer: string | null;
  numericAnswer: number | null;
  pointsEarned?: number;
}

export interface CertificationAttempt {
  id: string;
  userId: string;
  status: AttemptStatus;
  score: number | null;
  startedAt: string;
  lastActivityAt: string;
  completedAt: string | null;
  answers: Answer[];
}

export interface CertificationLevel {
  id: string;
  name: string;
  minScore: number;
  maxScore: number;
  /** `null` marks the lowest tier: the attempt closed but no badge was earned. */
  badgeIconUrl: string | null;
  order: number;
}

export interface CertificationSubmitResult {
  attempt: Omit<CertificationAttempt, 'answers'>;
  score: number;
  badge: CertificationLevel;
}

/** Body of `POST /certification/attempt/{attemptId}/answer`. Which field is
 *  required depends on the question's real type, checked server-side. */
export interface SubmitAnswerInput {
  questionId: string;
  optionId?: string;
  optionIds?: string[];
  textAnswer?: string;
  numericAnswer?: number;
}

export interface CertificationOptionInput {
  text: string;
  points: number;
  order: number;
}

export interface CertificationQuestionInput {
  order: number;
  type: QuestionType;
  text: string;
  description?: string;
  weight?: number;
  maxPoints?: number;
  options?: CertificationOptionInput[];
}

export type CertificationQuestionPatch = Partial<CertificationQuestionInput> & {
  isActive?: boolean;
};
