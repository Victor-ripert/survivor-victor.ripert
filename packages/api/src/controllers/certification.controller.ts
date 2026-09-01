import type { Request, Response } from 'express';
import { saveAnswer } from '../services/certification/answers.js';
import { getAttemptForUser, startOrResumeAttempt } from '../services/certification/attempts.js';
import {
  createQuestion,
  listAdminQuestions,
  listPublicQuestions,
  updateQuestion,
} from '../services/certification/questions.js';
import { submitAttempt } from '../services/certification/submit.js';
import { currentUser } from '../utils/current-user.js';
import { notFound } from '../utils/http-error.js';
import {
  createQuestionSchema,
  submitAnswerSchema,
  updateQuestionSchema,
} from '../validators/certification.js';
import { parseId } from '../validators/common.js';

// Services throw HttpError and Zod throws ZodError; both are turned into the
// uniform error body by middleware/error-handler.ts, so handlers only ever
// describe the success path.

export const getQuestions = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json(await listPublicQuestions());
};

export const getAdminQuestions = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json(await listAdminQuestions());
};

export const postQuestion = async (req: Request, res: Response): Promise<void> => {
  res.status(201).json(await createQuestion(createQuestionSchema.parse(req.body)));
};

export const patchQuestion = async (req: Request, res: Response): Promise<void> => {
  const question = await updateQuestion(
    parseId(req.params.id),
    updateQuestionSchema.parse(req.body),
  );

  if (!question) throw notFound('Question de certification introuvable');

  res.status(200).json(question);
};

export const postAttempt = async (req: Request, res: Response): Promise<void> => {
  const { attempt, created } = await startOrResumeAttempt(currentUser(req).id);

  res.status(created ? 201 : 200).json(attempt);
};

export const getAttempt = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json(await getAttemptForUser(parseId(req.params.attemptId), currentUser(req).id));
};

export const postAnswer = async (req: Request, res: Response): Promise<void> => {
  const answers = await saveAnswer(
    parseId(req.params.attemptId),
    currentUser(req).id,
    submitAnswerSchema.parse(req.body),
  );

  res.status(201).json(answers);
};

export const postSubmit = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json(await submitAttempt(parseId(req.params.attemptId), currentUser(req).id));
};
