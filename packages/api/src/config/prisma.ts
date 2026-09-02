import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './env.js';

// Through the validated env rather than `process.env`, so the connection
// string cannot silently be `undefined` when a script imports this module
// before anything has loaded the repo-root env files.
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
