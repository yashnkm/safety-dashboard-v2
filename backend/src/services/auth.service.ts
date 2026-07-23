import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/env';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { mailerService } from './mailer.service';

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export class AuthService {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        company: true,
        userSiteAccess: {
          include: {
            site: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new AppError(401, 'Invalid credentials');
    }

    // An expired lock is treated as no lock at all - it's cleared for real
    // below, once either a fresh lockout or a successful login happens.
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new AppError(
        423,
        `Account temporarily locked due to too many failed login attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      const attempts = user.failedLoginAttempts + 1;
      const isNowLocked = attempts >= MAX_FAILED_LOGIN_ATTEMPTS;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: isNowLocked ? 0 : attempts,
          // Reset to 0 on lockout so the user gets a full fresh set of
          // attempts once the lock naturally expires, rather than starting
          // pre-loaded at the threshold.
          lockedUntil: isNowLocked
            ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
            : null,
        },
      });

      if (isNowLocked) {
        throw new AppError(
          423,
          `Account temporarily locked due to too many failed login attempts. Try again in ${LOCKOUT_DURATION_MINUTES} minutes.`
        );
      }
      throw new AppError(401, 'Invalid credentials');
    }

    // Successful login clears any failure history and expired lock.
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date(), failedLoginAttempts: 0, lockedUntil: null },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        action: 'login',
        entityType: 'user',
        entityId: user.id,
      },
    });

    const token = jwt.sign(
      { userId: user.id },
      config.jwtSecret,
      { expiresIn: config.jwtExpiry } as jwt.SignOptions
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        accessLevel: user.accessLevel,
        company: {
          id: user.company.id,
          companyName: user.company.companyName,
          companyCode: user.company.companyCode,
          logoUrl: user.company.logoUrl,
        },
        sites: user.userSiteAccess.map((access) => ({
          id: access.site.id,
          siteName: access.site.siteName,
          siteCode: access.site.siteCode,
        })),
      },
    };
  }

  async register(data: {
    email: string;
    password: string;
    fullName: string;
    companyId: string;
    role: string;
  }) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError(400, 'User already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        companyId: data.companyId,
        role: data.role as any,
      },
      include: {
        company: true,
      },
    });

    const token = jwt.sign(
      { userId: user.id },
      config.jwtSecret,
      { expiresIn: config.jwtExpiry } as jwt.SignOptions
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        accessLevel: user.accessLevel,
        company: {
          id: user.company.id,
          companyName: user.company.companyName,
          companyCode: user.company.companyCode,
          logoUrl: user.company.logoUrl,
        },
      },
    };
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: true,
        userSiteAccess: {
          include: {
            site: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      accessLevel: user.accessLevel,
      company: {
        id: user.company.id,
        companyName: user.company.companyName,
        companyCode: user.company.companyCode,
        logoUrl: user.company.logoUrl,
      },
      sites: user.userSiteAccess.map((access) => ({
        id: access.site.id,
        siteName: access.site.siteName,
        siteCode: access.site.siteCode,
      })),
    };
  }

  /**
   * Generates a password reset token if the email belongs to an active user.
   * Always returns the same generic result regardless of whether the email
   * exists, to avoid leaking which emails are registered.
   */
  async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && user.isActive) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: hashedToken,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      const resetUrl = `${config.corsOrigin}/reset-password?token=${rawToken}`;
      const sent = await mailerService.sendPasswordResetEmail(email, resetUrl);

      if (!sent) {
        // SMTP not configured, or the send failed - fall back to a server
        // log so the flow still works in development/debugging.
        console.log(`\n🔑 Password reset requested for ${email}`);
        console.log(`   Reset link (valid 1 hour): ${resetUrl}\n`);
      }
    }

    return {
      message: 'If an account exists for that email, a password reset link has been generated.',
    };
  }

  /**
   * Consumes a reset token (single use, 1-hour expiry) and sets a new password.
   */
  async resetPassword(token: string, newPassword: string) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
    });

    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      throw new AppError(400, 'Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);

    return { message: 'Password reset successfully' };
  }
}
