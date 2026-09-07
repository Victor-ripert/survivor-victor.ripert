// Loaded first so that every module evaluated below sees the resolved
// environment (services/jwt.ts reads JWT_SECRET at import time).
import './config/env.js';

import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { apiRateLimiter } from './middleware/rate-limit.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { certificationAdminRouter, certificationRouter } from './routes/certification.js';
import { docsRouter } from './routes/docs.js';
import { healthRouter } from './routes/health.js';
import { interactionsRouter } from './routes/interactions.js';
import { notificationsRouter } from './routes/notifications.js';
import { profilesRouter } from './routes/profiles.js';
import { recruiterRouter } from './routes/recruiter.js';
import { skillsRouter } from './routes/skills.js';
import { videosRouter } from './routes/videos.js';
import { resolveUploadDir } from './services/video-providers/local.js';

const JSON_BODY_LIMIT = '64kb';

/** A year: the filenames are random UUIDs, so a stored file's content never
 *  changes under a given name and a revoked one stops resolving entirely. */
const UPLOAD_CACHE_MAX_AGE = '365d';

export const createApp = (): Express => {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  // Uploaded video files and their caption tracks. Mounted outside `/api`,
  // which is the path the web app builds from `VITE_API_URL`'s origin
  // (utils/embed.ts), and ahead of the rate limiter — one profile page pulls
  // a video plus its `.vtt`, and charging media to a reader's request budget
  // makes a page unwatchable after a few reloads.
  //
  // `resolveUploadDir()` throws for a directory inside the repository, so a
  // misconfigured UPLOAD_DIR stops the server here rather than surfacing much
  // later as a revocation that quietly fails to delete anything.
  //
  // The filenames are random UUIDs: an unlisted directory whose entries are
  // unguessable, disclosed only where the visibility rules already disclose a
  // video's URL. `index: false` keeps the listing itself unreadable, and
  // `dotfiles: 'deny'` refuses anything an operator dropped in by accident.
  app.use(
    '/uploads',
    cors({ origin: env.CORS_ORIGIN }),
    express.static(resolveUploadDir(), {
      index: false,
      dotfiles: 'deny',
      maxAge: UPLOAD_CACHE_MAX_AGE,
      // Helmet defaults Cross-Origin-Resource-Policy to same-origin, which
      // would stop the web app on its own port from loading either file.
      setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
    }),
  );

  // Health probes run on a timer and must not eat into the request budget.
  app.use('/api/health', healthRouter);
  // Same reasoning for the contract: one page load pulls four static files,
  // and charging those to the caller's quota makes the documentation
  // unreadable after a handful of refreshes.
  app.use('/api/docs', docsRouter);
  app.use('/api', apiRateLimiter);

  app.use('/api/auth', authRouter);
  app.use('/api/certification', certificationRouter);
  app.use('/api/interactions', interactionsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/profiles', profilesRouter);
  app.use('/api/recruiter', recruiterRouter);
  app.use('/api/skills', skillsRouter);
  // Bare /api, not /api/videos — its two routes live under two different
  // top-level paths (/profiles/:profileId/videos and /videos/:videoId), so
  // there's no single prefix that fits both. See routes/videos.ts.
  app.use('/api', videosRouter);

  // The certification admin routes guard themselves, so they are mounted
  // ahead of the blanket requireRole(ADMIN) that adminRouter applies to
  // everything under /api/admin.
  app.use('/api/admin', certificationAdminRouter);
  app.use('/api/admin', adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
