import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { observabilityService } from '../services/observability.service';

/**
 * Records one row per API request: who, what, status, how long.
 *
 * Mounted AFTER `authenticate` runs for a given route, so `req.user` is
 * populated where the route is authenticated — but it must not depend on that,
 * since login and the other public routes have no user. It hooks res 'finish'
 * rather than wrapping res.json, so the row is written once the response has
 * actually been sent and the real status code is known, and never delays it.
 *
 * Only the path is stored — never the query string, body or headers. See
 * observability.service for why that rule exists.
 */
export const requestLogger = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (observabilityService.shouldSkip(req.originalUrl || req.path)) {
    return next();
  }

  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    try {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      observabilityService.logRequest({
        method: req.method,
        path: req.originalUrl || req.path,
        statusCode: res.statusCode,
        durationMs,
        // req.user is set by `authenticate`; absent on public routes.
        userId: req.user?.id ?? null,
        companyId: req.user?.companyId ?? null,
        ipAddress: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
    } catch {
      /* logging must never affect the request */
    }
  });

  next();
};
