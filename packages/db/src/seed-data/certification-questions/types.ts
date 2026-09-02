import type { QuestionType } from '@prisma/client';

export interface CertificationOptionSeed {
  id: string;
  text: string;
  points: number;
  order: number;
}

export interface CertificationQuestionSeed {
  id: string;
  order: number;
  type: QuestionType;
  text: string;
  description?: string;
  weight: number;
  maxPoints: number;
  options?: CertificationOptionSeed[];
}
