import type { Request, Response } from 'express';
import { createQuestionSchema, updateQuestionSchema } from '../validators/certification.js';
import {
  listPublicQuestions,
  listAdminQuestions,
  createQuestion,
  updateQuestion,
  InvalidOptionsError,
  OptionsInUseError,
} from '../services/certification/questions.js';
import {
  startOrResumeAttempt,
  getAttemptForUser,
  AttemptNotFoundError,
  AttemptForbiddenError,
} from '../services/certification/attempts.js';

export const getQuestions = async (_req: Request, res: Response): Promise<void> => {
  const questions = await listPublicQuestions();
  res.status(200).json(questions);
};

export const getAdminQuestions = async (_req: Request, res: Response): Promise<void> => {
  const questions = await listAdminQuestions();
  res.status(200).json(questions);
};

export const postQuestion = async (req: Request, res: Response): Promise<void> => {
  const parsed = createQuestionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'validation_error',
      message: parsed.error.issues[0]?.message ?? 'Invalid input',
      statusCode: 400,
    });
    return;
  }

  const question = await createQuestion(parsed.data);
  res.status(201).json(question);
};

export const patchQuestion = async (req: Request, res: Response): Promise<void> => {
  const parsed = updateQuestionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'validation_error',
      message: parsed.error.issues[0]?.message ?? 'Invalid input',
      statusCode: 400,
    });
    return;
  }

  try {
    const question = await updateQuestion(req.params.id as string, parsed.data);
    if (!question) {
      res.status(404).json({
        error: 'not_found',
        message: 'Certification question not found',
        statusCode: 404,
      });
      return;
    }
    res.status(200).json(question);
  } catch (error) {
    if (error instanceof InvalidOptionsError) {
      res.status(400).json({ error: 'validation_error', message: error.message, statusCode: 400 });
      return;
    }
    if (error instanceof OptionsInUseError) {
      res.status(409).json({ error: 'conflict', message: error.message, statusCode: 409 });
      return;
    }
    throw error;
  }
};

export const postAttempt = async (req: Request, res: Response): Promise<void> => {
  const { attempt, created } = await startOrResumeAttempt(req.user!.id);
  res.status(created ? 201 : 200).json(attempt);
};

export const getAttempt = async (req: Request, res: Response): Promise<void> => {
  try {
    const attempt = await getAttemptForUser(req.params.attemptId as string, req.user!.id);
    res.status(200).json(attempt);
  } catch (error) {
    if (error instanceof AttemptNotFoundError) {
      res.status(404).json({ error: 'not_found', message: error.message, statusCode: 404 });
      return;
    }
    if (error instanceof AttemptForbiddenError) {
      res.status(403).json({ error: 'forbidden', message: error.message, statusCode: 403 });
      return;
    }
    throw error;
  }
};
