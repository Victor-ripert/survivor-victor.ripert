import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Default `dotenv/config` only looks in the current working directory, but
// `npm run db:seed -w @profils-actifs/db` runs with cwd = packages/db —
// point it explicitly at the root .env.local instead.
config({ path: fileURLToPath(new URL('../../../.env.local', import.meta.url)) });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
