import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { loadRepoEnv } from '@profils-actifs/shared/node';

// `npm run db:seed -w @profils-actifs/db` runs with cwd = packages/db, so
// nothing has loaded the repo's env files by this point.
loadRepoEnv();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
