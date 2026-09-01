import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

// Jest `setupFiles` run before any test file's imports are evaluated, which
// guarantees DATABASE_URL/JWT_SECRET exist before config/prisma.ts or
// services/jwt.ts read process.env — unlike loading dotenv inline in a test
// file, this doesn't depend on import order.
config({ path: fileURLToPath(new URL('../../../.env.local', import.meta.url)) });
