import { defineConfig } from 'prisma/config';
import { loadRepoEnv } from '@profils-actifs/shared/node';

// Prisma's config-file system (unlike the old schema-based one) loads no
// .env file on its own, and the CLI runs with cwd = packages/db, so the repo's
// root env files are loaded explicitly here.
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
    // Only `prisma migrate diff --from-migrations` needs this, and only to prove
    // that replaying the migrations directory lands on exactly the schema
    // (brief §8.2: the schema deliverable must match the real migrations, not
    // the intent). Left undefined when the variable is unset, so `migrate dev`
    // keeps creating and dropping its own temporary shadow database instead of
    // reusing a named one.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
