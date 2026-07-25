import { PrismaClient } from '@prisma/client';

/**
 * The database is cloud-hosted (db.prisma.io) while the app runs on a
 * self-hosted PC, so brief network blips surface as Prisma P1001
 * ("Can't reach database server") errors on otherwise-fine requests.
 *
 * This extension transparently retries P1001 with a short exponential
 * backoff. It's safe for writes too: P1001 means the query never reached
 * the server, so there's no risk of a partial/double apply.
 */
const RETRYABLE_CODES = new Set(['P1001']);
const MAX_RETRIES = 3;

const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

const prisma = basePrisma.$extends({
  query: {
    async $allOperations({ args, query }) {
      let lastErr: unknown;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          return await query(args);
        } catch (err: any) {
          const transient =
            RETRYABLE_CODES.has(err?.code) ||
            /Can't reach database server/i.test(err?.message || '');
          if (!transient || attempt === MAX_RETRIES) throw err;
          lastErr = err;
          const backoff = 150 * 2 ** attempt; // 150ms, 300ms, 600ms
          console.warn(
            `DB unreachable (${err?.code || 'P1001'}), retry ${attempt + 1}/${MAX_RETRIES} in ${backoff}ms`
          );
          await new Promise((res) => setTimeout(res, backoff));
        }
      }
      throw lastErr;
    },
  },
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await basePrisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await basePrisma.$disconnect();
  process.exit(0);
});

export default prisma;
