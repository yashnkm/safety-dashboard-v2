import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import prisma from '../config/database';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    companyId: string;
    role: string;
    accessLevel: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new AppError(401, 'No token provided');
    }

    const decoded = jwt.verify(token, config.jwtSecret) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        companyId: true,
        role: true,
        accessLevel: true,
        isActive: true,
        tokensValidFrom: true,
      },
    });

    if (!user || !user.isActive) {
      throw new AppError(401, 'Invalid or expired token');
    }

    // Reject tokens issued before the user's last revocation point (password
    // change or logout). Without this a stolen token outlives the password it
    // came from, for the full 7-day lifetime.
    //
    // `iat` is whole seconds, so a token signed at 12:00:00.800 carries
    // iat=12:00:00.000 — up to 999ms EARLIER than it was actually issued. The
    // 1s allowance below stops a freshly minted token from being rejected by a
    // revocation stamped microseconds before it; anything genuinely older is
    // still refused.
    if (user.tokensValidFrom && typeof decoded.iat === 'number') {
      if (decoded.iat * 1000 < user.tokensValidFrom.getTime() - 1000) {
        throw new AppError(401, 'Session expired, please sign in again');
      }
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError(401, 'Invalid token'));
    } else {
      next(error);
    }
  }
};
