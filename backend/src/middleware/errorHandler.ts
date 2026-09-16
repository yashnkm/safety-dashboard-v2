import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { observabilityService } from '../services/observability.service';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Async handler wrapper to catch errors in async route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Persist anything unexpected so it is visible in the Admin panel rather than
  // only in a console nobody is watching. Operational AppErrors (a 400 for a
  // bad password, a 403 for the wrong role) are normal traffic and would drown
  // the log, so only 5xx-class AppErrors and genuine exceptions are recorded.
  const isOperational = err instanceof AppError && err.statusCode < 500;
  if (!isOperational) {
    const user = (req as any).user;
    observabilityService.logError({
      message: err.message || 'Unknown error',
      stack: err.stack,
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: err instanceof AppError ? err.statusCode : 500,
      userId: user?.id ?? null,
      companyId: user?.companyId ?? null,
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 2MB)' : err.message;
    return res.status(400).json({
      status: 'error',
      message,
    });
  }

  // Log unexpected errors
  console.error('Unexpected error:', err);

  return res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
};
