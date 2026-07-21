import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/env';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

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

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
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
   *
   * No SMTP provider is configured yet (EMAIL_* in .env are placeholders),
   * so the reset link is logged server-side instead of emailed. Once real
   * credentials are added, swap the console.log below for an actual send —
   * everything else in this flow already works end-to-end.
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
      console.log(`\n🔑 Password reset requested for ${email}`);
      console.log(`   Reset link (valid 1 hour): ${resetUrl}\n`);
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
