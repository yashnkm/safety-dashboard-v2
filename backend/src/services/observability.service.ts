import fs from 'fs';
import path from 'path';
import prisma from '../config/database';

/**
 * Request + error logging, and the retention that keeps them from growing
 * without bound.
 *
 * Two rules shape this file:
 *
 * 1. Logging must never break a request. Every write is fire-and-forget and
 *    swallows its own errors — an observability feature that can 500 the app
 *    it observes is worse than no observability.
 *
 * 2. Errors must still be recordable when the database is unreachable, which
 *    is precisely when they matter most. So error writes fall back to a file.
 */

const LOG_DIR = path.join(__dirname, '../../logs');
const ERROR_FALLBACK = path.join(LOG_DIR, 'errors-fallback.log');

// Request logs are high-volume and bounded; errors are rare and kept longer.
export const REQUEST_LOG_RETENTION_DAYS = 14;
export const ERROR_LOG_RETENTION_DAYS = 90;

// Paths whose bodies/headers are sensitive, or which are simply too noisy to
// be worth a row. /health is hit continuously by the uptime monitor.
const SKIP_PATHS = [/^\/api\/health$/, /^\/uploads\//];

export interface RequestLogInput {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  userId?: string | null;
  userEmail?: string | null;
  companyId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface ErrorLogInput {
  message: string;
  stack?: string | null;
  method?: string | null;
  path?: string | null;
  statusCode?: number | null;
  userId?: string | null;
  userEmail?: string | null;
  companyId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

class ObservabilityService {
  shouldSkip(reqPath: string): boolean {
    return SKIP_PATHS.some((re) => re.test(reqPath));
  }

  /**
   * Never records request bodies, query strings, headers or cookies — only the
   * path. A reset link arrives as ?token=..., and a login posts a password, so
   * capturing either would recreate the credential-leak bug this codebase has
   * already had once.
   */
  private sanitizePath(fullPath: string): string {
    const [clean] = fullPath.split('?');
    return clean.slice(0, 500);
  }

  logRequest(input: RequestLogInput): void {
    const data = {
      method: input.method.slice(0, 10),
      path: this.sanitizePath(input.path),
      statusCode: input.statusCode,
      durationMs: Math.round(input.durationMs),
      userId: input.userId ?? null,
      userEmail: input.userEmail ?? null,
      companyId: input.companyId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: (input.userAgent ?? null)?.slice(0, 300) ?? null,
    };
    // Fire-and-forget: the response has already been sent by now.
    prisma.requestLog.create({ data }).catch(() => {
      /* dropped deliberately — see rule 1 above */
    });
  }

  logError(input: ErrorLogInput): void {
    const data = {
      // Prisma errors arrive with a leading newline and are multi-line, which
      // renders as a blank title in the admin list. Trim so the first line is
      // always the actual summary.
      message: String(input.message).trim().slice(0, 2000) || 'Unknown error',
      stack: input.stack ? String(input.stack).trim().slice(0, 8000) : null,
      method: input.method ?? null,
      path: input.path ? this.sanitizePath(input.path) : null,
      statusCode: input.statusCode ?? null,
      userId: input.userId ?? null,
      userEmail: input.userEmail ?? null,
      companyId: input.companyId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: (input.userAgent ?? null)?.slice(0, 300) ?? null,
    };
    prisma.errorLog.create({ data }).catch(() => this.writeErrorToFile(data));
  }

  /** Last resort when the database is the thing that's broken. */
  private writeErrorToFile(data: Record<string, unknown>): void {
    try {
      fs.mkdirSync(LOG_DIR, { recursive: true });
      fs.appendFileSync(
        ERROR_FALLBACK,
        JSON.stringify({ at: new Date().toISOString(), ...data }) + '\n',
        'utf8'
      );
    } catch {
      /* nothing left to try */
    }
  }

  /**
   * Deletes entries past their retention window. Called on boot and daily —
   * without it the request log grows unbounded and can exhaust the database's
   * storage quota, turning a logging feature into an outage.
   */
  async pruneOldLogs(): Promise<{ requests: number; errors: number } | null> {
    try {
      const reqCutoff = new Date(Date.now() - REQUEST_LOG_RETENTION_DAYS * 86400000);
      const errCutoff = new Date(Date.now() - ERROR_LOG_RETENTION_DAYS * 86400000);
      const [requests, errors] = await Promise.all([
        prisma.requestLog.deleteMany({ where: { createdAt: { lt: reqCutoff } } }),
        prisma.errorLog.deleteMany({ where: { createdAt: { lt: errCutoff } } }),
      ]);
      return { requests: requests.count, errors: errors.count };
    } catch {
      return null;
    }
  }

  /** Prune now, then once a day. Unref'd so it never holds the process open. */
  startRetentionJob(): void {
    const run = () => {
      this.pruneOldLogs().then((r) => {
        if (r && (r.requests || r.errors)) {
          console.log(`[observability] pruned ${r.requests} request logs, ${r.errors} error logs`);
        }
      });
    };
    run();
    setInterval(run, 24 * 60 * 60 * 1000).unref();
  }
}

export const observabilityService = new ObservabilityService();
