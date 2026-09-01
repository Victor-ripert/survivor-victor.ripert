import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'prisma/config';

// Prisma's config-file system (unlike the old schema-based one) loads no
// .env file on its own — the repo's env vars live in the root .env.local,
// two levels up from this package.
config({ path: fileURLToPath(new URL('../../.env.local', import.meta.url)) });

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
