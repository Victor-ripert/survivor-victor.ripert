import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';

const server = createApp().listen(env.API_PORT, env.API_HOST, () => {
  console.log(`[api] listening on http://${env.API_HOST}:${env.API_PORT}/api (${env.NODE_ENV})`);
});

/** Lets in-flight requests finish and closes the pool, so a restart does not
 *  drop connections mid-response. */
const shutdown = (signal: NodeJS.Signals): void => {
  console.log(`[api] ${signal} received, shutting down`);

  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
