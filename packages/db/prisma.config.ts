import { defineConfig } from 'prisma/config';
import { loadRepoEnv } from './src/load-env.js';

loadRepoEnv();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Plain process.env (not the `env()` helper) so `prisma generate` keeps working
    // without a database connection — only migrate/studio/db push actually need this set.
    url: process.env.DATABASE_URL,
  },
});
