import { Router } from 'express';
import {
  getQuestions,
  getAdminQuestions,
  postQuestion,
  patchQuestion,
  postAttempt,
  getAttempt,
  postAnswer,
} from '../controllers/certification.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

// Mounted at /certification — candidate-facing, no scoring data exposed.
export const certificationRouter = Router();

certificationRouter.get('/questions', getQuestions);
certificationRouter.post('/attempt', requireAuth, requireRole('APPLICANT'), postAttempt);
certificationRouter.get('/attempt/:attemptId', requireAuth, requireRole('APPLICANT'), getAttempt);
certificationRouter.post('/attempt/:attemptId/answer', requireAuth, requireRole('APPLICANT'), postAnswer);

// Mounted at /admin — alongside the other domains' admin routes, so the
// full path ends up /admin/certification/questions.
export const certificationAdminRouter = Router();

certificationAdminRouter.get('/certification/questions', requireAuth, requireRole('ADMIN'), getAdminQuestions);
certificationAdminRouter.post('/certification/questions', requireAuth, requireRole('ADMIN'), postQuestion);
certificationAdminRouter.patch('/certification/questions/:id', requireAuth, requireRole('ADMIN'), patchQuestion);
