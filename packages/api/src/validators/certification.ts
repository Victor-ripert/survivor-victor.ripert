import { z } from 'zod';

const questionTypeSchema = z.enum(['MULTIPLE_CHOICE', 'SHORT_TEXT', 'CHECKBOX', 'LIKERT_SCALE'], {
  error: 'Type de question invalide',
});

const optionInputSchema = z.object({
  text: z.string().min(1, { error: "Le texte de l'option est requis" }),
  points: z.number().int().min(0, { error: 'Les points doivent être positifs' }),
  order: z.number().int().min(0, { error: "L'ordre doit être positif" }),
});

// Shared with the update path in services/certification/questions.ts, which
// resolves the *effective* type (existing DB value merged with the patch)
// before re-checking this same rule.
const CHOICE_TYPES = new Set(['MULTIPLE_CHOICE', 'CHECKBOX']);

export const questionTypeRequiresOptions = (type: string): boolean => CHOICE_TYPES.has(type);

export const createQuestionSchema = z
  .object({
    order: z.number().int().min(0, { error: "L'ordre doit être positif" }),
    type: questionTypeSchema,
    text: z.string().min(1, { error: 'Le texte de la question est requis' }),
    description: z.string().optional(),
    weight: z.number().int().min(1, { error: 'Le poids doit être au moins 1' }).default(1),
    maxPoints: z.number().int().min(1, { error: 'maxPoints doit être au moins 1' }).default(10),
    options: z.array(optionInputSchema).optional(),
  })
  .refine((data) => !CHOICE_TYPES.has(data.type) || (data.options?.length ?? 0) >= 2, {
    error: 'Une question à choix (MULTIPLE_CHOICE ou CHECKBOX) nécessite au moins 2 options',
    path: ['options'],
  });

export const updateQuestionSchema = z.object({
  order: z.number().int().min(0).optional(),
  type: questionTypeSchema.optional(),
  text: z.string().min(1).optional(),
  description: z.string().optional(),
  weight: z.number().int().min(1, { error: 'Le poids doit être au moins 1' }).optional(),
  maxPoints: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  options: z.array(optionInputSchema).optional(),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;

// Matches the "1 (pas du tout d'accord) à 5 (tout à fait d'accord)" scale
// described on every LIKERT_SCALE question in the seed.
export const LIKERT_MIN = 1;
export const LIKERT_MAX = 5;

// Shape-only validation — which of these fields is actually required depends
// on the question's real type in the DB, checked in
// services/certification/answers.ts (never trust a client-supplied type).
export const submitAnswerSchema = z.object({
  questionId: z.string().min(1, { error: 'questionId est requis' }),
  optionId: z.string().optional(),
  optionIds: z.array(z.string()).optional(),
  textAnswer: z.string().optional(),
  numericAnswer: z.number().int().min(LIKERT_MIN).max(LIKERT_MAX).optional(),
});

export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
