import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
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
      },
      sites: user.userSiteAccess.map((access) => ({
        id: access.site.id,
        siteName: access.site.siteName,
        siteCode: access.site.siteCode,
      })),
    };
  }
}
