import type { Server } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';

/** How long a shutdown waits for in-flight requests before giving up on them.
 *  Past this, a hung connection would keep the process alive indefinitely and
 *  a restart would never complete. */
const SHUTDOWN_GRACE_MS = 10_000;

const server: Server = createApp().listen(env.API_PORT, env.API_HOST, () => {
  console.log(`[api] listening on http://${env.API_HOST}:${env.API_PORT}/api (${env.NODE_ENV})`);
});

/**
 * Listen failures arrive as an event, not as a throw from `listen()`, so
 * without this handler the port already being taken surfaces as an unhandled
 * error event and a stack trace. The two cases worth naming are the two that
 * actually happen on a developer machine.
 */
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `[api] port ${env.API_PORT} is already in use — stop the other process or set API_PORT`,
    );
  } else if (error.code === 'EACCES') {
    console.error(`[api] not allowed to bind ${env.API_HOST}:${env.API_PORT}`);
  } else {
    console.error('[api] server error', error);
  }

  process.exit(1);
});

/**
 * A boot-time probe, reported and not fatal: the API answers `/api/health`
 * with a 503 while the database is down, which is more useful than refusing to
 * start — the process is then already up when Postgres comes back.
 */
void prisma.$queryRaw`SELECT 1`
  .then(() => console.log('[api] database reachable'))
  .catch((error: unknown) => {
    console.error(
      '[api] database unreachable at startup — /api/health will report 503 until it answers',
      error,
    );
  });

let isShuttingDown = false;

/** Lets in-flight requests finish and closes the pool, so a restart does not
 *  drop connections mid-response. A second signal stops waiting. */
const shutdown = (signal: NodeJS.Signals): void => {
  if (isShuttingDown) {
    console.warn(`[api] ${signal} received again, exiting now`);
    process.exit(1);
  }

  isShuttingDown = true;
  console.log(`[api] ${signal} received, shutting down`);

  const forceExit = setTimeout(() => {
    console.error('[api] shutdown timed out, exiting with connections still open');
    process.exit(1);
  }, SHUTDOWN_GRACE_MS);
  // Node keeps the loop alive for a pending timer; this one must not be what
  // holds the process open once everything else has closed.
  forceExit.unref();

  server.close((error?: Error) => {
    if (error) console.error('[api] server did not close cleanly', error);

    prisma
      .$disconnect()
      .catch((cause: unknown) => console.error('[api] prisma did not disconnect cleanly', cause))
      .finally(() => process.exit(error ? 1 : 0));
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

/**
 * A rejected promise nobody awaited, or an exception thrown outside a request,
 * leaves the process in a state no request handler can reason about. Both are
 * logged and answered by an orderly shutdown rather than by carrying on: a
 * supervisor restarts a stopped process, it cannot fix a poisoned one.
 */
process.on('unhandledRejection', (reason: unknown) => {
  console.error('[api] unhandled promise rejection', reason);
  shutdown('SIGTERM');
});

process.on('uncaughtException', (error: Error) => {
  console.error('[api] uncaught exception', error);
  shutdown('SIGTERM');
});
