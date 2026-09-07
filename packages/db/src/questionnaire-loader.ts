import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// The questionnaire's content is not code — it lives in a versioned JSON
// file at the repo root (certification/questions.v1.json), reviewed and
// changed by a plain commit, never by a database migration or a direct API
// mutation. This loader is the only thing allowed to read it.

const QUESTIONNAIRE_PATH = fileURLToPath(
  new URL('../../../certification/questions.v1.json', import.meta.url),
);

const CHOICE_TYPES = new Set(['MULTIPLE_CHOICE', 'CHECKBOX']);

const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  points: z.number().int().min(0),
  order: z.number().int().min(0),
});

const questionSchema = z
  .object({
    id: z.string().min(1),
    order: z.number().int().min(0),
    type: z.enum(['MULTIPLE_CHOICE', 'SHORT_TEXT', 'CHECKBOX', 'LIKERT_SCALE']),
    text: z.string().min(1),
    description: z.string().optional(),
    weight: z.number().int().min(1),
    maxPoints: z.number().int().min(1),
    options: z.array(optionSchema).optional(),
  })
  .refine((question) => !CHOICE_TYPES.has(question.type) || (question.options?.length ?? 0) >= 2, {
    error: 'Une question MULTIPLE_CHOICE ou CHECKBOX nécessite au moins 2 options',
    path: ['options'],
  });

const questionnaireSchema = z
  .object({
    version: z.string().min(1),
    questions: z.array(questionSchema).min(1),
  })
  .superRefine((questionnaire, ctx) => {
    const seenQuestionIds = new Set<string>();
    const seenOptionIds = new Set<string>();

    questionnaire.questions.forEach((question, index) => {
      if (seenQuestionIds.has(question.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `Identifiant de question dupliqué : "${question.id}"`,
          path: ['questions', index, 'id'],
        });
      }
      seenQuestionIds.add(question.id);

      for (const [optionIndex, option] of (question.options ?? []).entries()) {
        if (seenOptionIds.has(option.id)) {
          ctx.addIssue({
            code: 'custom',
            message: `Identifiant d'option dupliqué : "${option.id}"`,
            path: ['questions', index, 'options', optionIndex, 'id'],
          });
        }
        seenOptionIds.add(option.id);
      }
    });
  });

export type LoadedQuestionnaire = z.infer<typeof questionnaireSchema>;

/** Raised on anything wrong with the file — missing, malformed JSON, or
 *  failing the schema. The message always names the specific question at
 *  fault (by id when the row parsed far enough to have one, by position
 *  otherwise), never just "invalid file": per Thomas Vignal's brief, a
 *  half-loaded questionnaire is worse than no questionnaire, so this is
 *  meant to be thrown before a single row reaches the database. */
export class QuestionnaireValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuestionnaireValidationError';
  }
}

const describeIssue = (issue: z.core.$ZodIssue, rawQuestions: unknown): string => {
  const [, questionIndex, ...rest] = issue.path;

  const identifier =
    typeof questionIndex === 'number' && Array.isArray(rawQuestions)
      ? ((rawQuestions[questionIndex] as { id?: unknown } | undefined)?.id ??
        `position ${questionIndex}`)
      : 'inconnue';

  const field = rest.length > 0 ? rest.join('.') : '(racine)';
  return `Question ${JSON.stringify(identifier)}, champ "${field}" : ${issue.message}`;
};

export const loadQuestionnaire = (): LoadedQuestionnaire => {
  let raw: string;
  try {
    raw = readFileSync(QUESTIONNAIRE_PATH, 'utf-8');
  } catch (error) {
    throw new QuestionnaireValidationError(
      `Impossible de lire ${QUESTIONNAIRE_PATH} : ${(error as Error).message}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new QuestionnaireValidationError(
      `${QUESTIONNAIRE_PATH} n'est pas un JSON valide : ${(error as Error).message}`,
    );
  }

  const result = questionnaireSchema.safeParse(parsed);
  if (!result.success) {
    const rawQuestions = (parsed as { questions?: unknown })?.questions;
    const messages = result.error.issues.map((issue) => describeIssue(issue, rawQuestions));
    throw new QuestionnaireValidationError(
      `Questionnaire invalide (${QUESTIONNAIRE_PATH}) — ${messages.length} problème(s) :\n` +
        messages.map((message) => `  - ${message}`).join('\n'),
    );
  }

  return result.data;
};
