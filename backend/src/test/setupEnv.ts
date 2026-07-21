// Dummy env vars so importing safetyMetrics.service.ts (which transitively
// imports config/database.ts and config/env.ts) doesn't throw or try to
// reach a real database — the scoring logic under test never queries Prisma.
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET ||= 'test-secret';
