import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { cleanupOrphanedLogos } from './logoCleanup.service';
import { safetyMetricsService, SCORE_DIRECTIONS, ScoreDirection } from './safetyMetrics.service';
import { auditLogService } from './auditLog.service';
import bcrypt from 'bcrypt';

export class AdminService {
  // ==================== COMPANIES ====================

  async getAllCompanies() {
    return await prisma.company.findMany({
      include: {
        _count: {
          select: {
            sites: true,
            users: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCompany(data: any) {
    // Check if company code already exists
    const existing = await prisma.company.findUnique({
      where: { companyCode: data.companyCode },
    });

    if (existing) {
      throw new AppError(400, 'Company code already exists');
    }

    return await prisma.company.create({
      data: {
        companyName: data.companyName,
        companyCode: data.companyCode,
        industry: data.industry,
        address: data.address,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        logoUrl: data.logoUrl,
      },
    });
  }

  async updateCompany(id: string, data: any) {
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      throw new AppError(404, 'Company not found');
    }

    const updated = await prisma.company.update({
      where: { id },
      data: {
        companyName: data.companyName,
        industry: data.industry,
        address: data.address,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        logoUrl: data.logoUrl,
        isActive: data.isActive,
      },
    });

    // If the logo changed (replaced or removed), the old file on disk is
    // now unreferenced. Don't block the response on this housekeeping.
    if (data.logoUrl !== company.logoUrl) {
      cleanupOrphanedLogos();
    }

    return updated;
  }

  async deleteCompany(id: string) {
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      throw new AppError(404, 'Company not found');
    }

    await prisma.company.delete({ where: { id } });

    if (company.logoUrl) {
      cleanupOrphanedLogos();
    }
  }

  // ==================== COMPANY SETTINGS (Parameter Weights) ====================

  async getCompanySettings(companyId: string, callerCompanyId: string, callerRole: string) {
    if (callerRole !== 'SUPER_ADMIN' && companyId !== callerCompanyId) {
      throw new AppError(403, 'Access denied to this company');
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new AppError(404, 'Company not found');
    }

    const settings = await prisma.companySettings.findUnique({ where: { companyId } });
    const fieldMap = safetyMetricsService.getWeightFieldMap();
    const config = await safetyMetricsService.getCompanyScoringConfig(companyId);

    const base = {
      companyId,
      directions: config.directions,
      directionDefaults: safetyMetricsService.getDirectionDefaults(),
      excellentAt: config.excellentAt,
      goodAt: config.goodAt,
    };

    if (!settings) {
      return { ...base, isCustom: false, weights: safetyMetricsService.getDefaultWeights() };
    }

    const weights: Record<string, number> = {};
    for (const [paramKey, dbField] of fieldMap) {
      weights[paramKey] = Number((settings as any)[dbField]);
    }

    return { ...base, isCustom: true, weights, updatedAt: settings.updatedAt };
  }

  async updateCompanySettings(
    companyId: string,
    weights: Record<string, number>,
    callerCompanyId: string,
    callerRole: string,
    userId: string,
    options?: { directions?: Record<string, string>; excellentAt?: number; goodAt?: number }
  ) {
    if (callerRole !== 'SUPER_ADMIN' && companyId !== callerCompanyId) {
      throw new AppError(403, 'Access denied to this company');
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new AppError(404, 'Company not found');
    }

    const fieldMap = safetyMetricsService.getWeightFieldMap();
    const dbData: Record<string, any> = {};
    let sum = 0;

    for (const [paramKey, dbField] of fieldMap) {
      const value = Number(weights[paramKey]);
      if (!Number.isFinite(value) || value < 0) {
        throw new AppError(400, `Invalid weight for "${paramKey}": must be a non-negative number`);
      }
      dbData[dbField] = value;
      sum += value;
    }

    // Small tolerance for rounding, not for genuinely mis-entered totals.
    if (Math.abs(sum - 100) > 0.5) {
      throw new AppError(400, `Parameter weights must sum to 100 (currently ${sum.toFixed(2)})`);
    }

    // Optional per-parameter scoring directions.
    if (options?.directions) {
      const validKeys = new Set(safetyMetricsService.getParameterKeys());
      const cleaned: Record<string, ScoreDirection> = {};
      for (const [key, dir] of Object.entries(options.directions)) {
        if (!validKeys.has(key)) throw new AppError(400, `Unknown parameter "${key}"`);
        if (!SCORE_DIRECTIONS.includes(dir as ScoreDirection)) {
          throw new AppError(400, `Invalid direction "${dir}" for "${key}"`);
        }
        cleaned[key] = dir as ScoreDirection;
      }
      dbData.scoringDirections = cleaned;
    }

    // Optional status-label cutoffs.
    if (options?.excellentAt !== undefined || options?.goodAt !== undefined) {
      const ex = Number(options.excellentAt);
      const gd = Number(options.goodAt);
      if (!Number.isFinite(ex) || !Number.isFinite(gd) || !(gd > 0 && gd < ex && ex <= 100)) {
        throw new AppError(400, 'Status cutoffs must satisfy 0 < Good < Excellent ≤ 100');
      }
      dbData.statusExcellentAt = ex;
      dbData.statusGoodAt = gd;
    }

    return await prisma.companySettings.upsert({
      where: { companyId },
      update: { ...dbData, updatedBy: userId },
      create: { companyId, ...dbData, updatedBy: userId },
    });
  }

  // ==================== OBSERVABILITY ====================
  // Route-gated to SUPER_ADMIN, so these are not company-scoped: they are
  // platform-operator views spanning every tenant. Emails are resolved from
  // the denormalised userId rather than joined, because a log row must stay
  // readable after the account it refers to has been deleted.

  private async attachUserEmails<T extends { userId: string | null }>(rows: T[]) {
    const ids = [...new Set(rows.map((r) => r.userId).filter(Boolean))] as string[];
    if (ids.length === 0) return rows.map((r) => ({ ...r, userEmail: null }));
    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, email: true },
    });
    const byId = new Map(users.map((u) => [u.id, u.email]));
    return rows.map((r) => ({ ...r, userEmail: r.userId ? byId.get(r.userId) ?? null : null }));
  }

  async getRequestLogs(filters: {
    userId?: string;
    statusClass?: string;
    path?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.path) where.path = { contains: filters.path };
    // e.g. "4" -> 400-499, "5" -> 500-599
    if (filters.statusClass) {
      const base = parseInt(filters.statusClass, 10) * 100;
      if (Number.isFinite(base)) where.statusCode = { gte: base, lt: base + 100 };
    }

    const take = Math.min(filters.limit ?? 100, 200);
    const [rows, total] = await Promise.all([
      prisma.requestLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip: filters.offset ?? 0,
      }),
      prisma.requestLog.count({ where }),
    ]);
    return { logs: await this.attachUserEmails(rows), total };
  }

  async getErrorLogs(filters: { limit?: number; offset?: number }) {
    const take = Math.min(filters.limit ?? 50, 200);
    const [rows, total] = await Promise.all([
      prisma.errorLog.findMany({
        orderBy: { createdAt: 'desc' },
        take,
        skip: filters.offset ?? 0,
      }),
      prisma.errorLog.count(),
    ]);
    return { logs: await this.attachUserEmails(rows), total };
  }

  // ==================== SITES ====================

  async getSites(companyId?: string) {
    const where = companyId ? { companyId } : {};

    return await prisma.site.findMany({
      where,
      include: {
        company: {
          select: {
            companyName: true,
            companyCode: true,
          },
        },
        _count: {
          select: {
            userSiteAccess: true,
            safetyMetrics: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSite(data: any) {
    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: data.companyId },
    });

    if (!company) {
      throw new AppError(404, 'Company not found');
    }

    // Check if site code already exists for this company
    const existing = await prisma.site.findFirst({
      where: {
        companyId: data.companyId,
        siteCode: data.siteCode,
      },
    });

    if (existing) {
      throw new AppError(400, 'Site code already exists for this company');
    }

    return await prisma.site.create({
      data: {
        companyId: data.companyId,
        siteName: data.siteName,
        siteCode: data.siteCode,
        siteType: data.siteType,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        managerName: data.managerName,
        managerEmail: data.managerEmail,
        managerPhone: data.managerPhone,
      },
    });
  }

  async updateSite(id: string, data: any, callerCompanyId: string, callerRole: string) {
    const site = await prisma.site.findUnique({ where: { id } });
    if (!site) {
      throw new AppError(404, 'Site not found');
    }
    if (callerRole !== 'SUPER_ADMIN' && site.companyId !== callerCompanyId) {
      throw new AppError(403, 'Access denied to this site');
    }

    return await prisma.site.update({
      where: { id },
      data: {
        siteName: data.siteName,
        siteType: data.siteType,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        managerName: data.managerName,
        managerEmail: data.managerEmail,
        managerPhone: data.managerPhone,
        isActive: data.isActive,
      },
    });
  }

  async deleteSite(id: string, callerCompanyId: string, callerRole: string) {
    const site = await prisma.site.findUnique({ where: { id } });
    if (!site) {
      throw new AppError(404, 'Site not found');
    }
    if (callerRole !== 'SUPER_ADMIN' && site.companyId !== callerCompanyId) {
      throw new AppError(403, 'Access denied to this site');
    }

    await prisma.site.delete({ where: { id } });
  }

  // ==================== USERS ====================

  async getUsers(companyId?: string) {
    const where = companyId ? { companyId } : {};

    return await prisma.user.findMany({
      where,
      select: {
        id: true,
        companyId: true,
        email: true,
        fullName: true,
        role: true,
        accessLevel: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        company: {
          select: {
            companyName: true,
            companyCode: true,
          },
        },
        userSiteAccess: {
          select: {
            site: {
              select: {
                id: true,
                siteName: true,
                siteCode: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Guard role assignment. Rejects unknown roles, and never lets a caller grant
   * SUPER_ADMIN unless they already are one. Without this, a client's own ADMIN
   * could mint a SUPER_ADMIN account and read every other client's data, since
   * SUPER_ADMIN is the role all cross-company checks key on.
   */
  private assertRoleAssignable(role: string | undefined, callerRole: string) {
    if (role === undefined || role === null) return; // no role change requested
    const VALID_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER'];
    if (!VALID_ROLES.includes(role)) {
      throw new AppError(400, `Invalid role "${role}"`);
    }
    if (role === 'SUPER_ADMIN' && callerRole !== 'SUPER_ADMIN') {
      throw new AppError(403, 'Only a SUPER_ADMIN can grant the SUPER_ADMIN role');
    }
  }

  /**
   * Password rules for admin-created/updated accounts. The reset flow already
   * enforces a minimum, but this path enforced nothing — so `"password": "a"`
   * created a real one-character account, and a missing password reached
   * bcrypt.hash(undefined) and surfaced as a 500 instead of a clear 400.
   * This is how every client login is provisioned, so it matters.
   */
  private assertValidPassword(password: unknown) {
    if (typeof password !== 'string' || password.length === 0) {
      throw new AppError(400, 'Password is required');
    }
    if (password.length < 8) {
      throw new AppError(400, 'Password must be at least 8 characters');
    }
    // bcrypt only uses the first 72 bytes; cap the input so an oversized
    // body can't be used to burn CPU.
    if (password.length > 200) {
      throw new AppError(400, 'Password must be at most 200 characters');
    }
  }

  async createUser(data: any, callerRole: string) {
    this.assertRoleAssignable(data.role, callerRole);
    this.assertValidPassword(data.password);

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: data.companyId },
    });

    if (!company) {
      throw new AppError(404, 'Company not found');
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new AppError(400, 'Email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    return await prisma.user.create({
      data: {
        companyId: data.companyId,
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        role: data.role,
        accessLevel: data.accessLevel || 'ALL_SITES',
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        accessLevel: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async updateUser(id: string, data: any, callerCompanyId: string, callerRole: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError(404, 'User not found');
    }
    if (callerRole !== 'SUPER_ADMIN' && user.companyId !== callerCompanyId) {
      throw new AppError(403, 'Access denied to this user');
    }

    this.assertRoleAssignable(data.role, callerRole);

    const updateData: any = {
      fullName: data.fullName,
      role: data.role,
      accessLevel: data.accessLevel,
      isActive: data.isActive,
    };

    // Only update password if provided — but when it is, hold it to the same
    // minimum as creation and the reset flow.
    if (data.password !== undefined && data.password !== null && data.password !== '') {
      this.assertValidPassword(data.password);
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
      // An admin resetting someone's password must end that person's existing
      // sessions too — otherwise a compromised account stays reachable with the
      // old token for the rest of its 7-day life.
      updateData.tokensValidFrom = new Date();
    }

    // Deactivating an account already blocks new requests via the isActive
    // check, but stamping the cutoff makes the revocation explicit and
    // survives the account being re-enabled later.
    if (data.isActive === false) {
      updateData.tokensValidFrom = new Date();
    }

    return await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        accessLevel: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async deleteUser(id: string, callerCompanyId: string, callerRole: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError(404, 'User not found');
    }
    if (callerRole !== 'SUPER_ADMIN' && user.companyId !== callerCompanyId) {
      throw new AppError(403, 'Access denied to this user');
    }

    await prisma.user.delete({ where: { id } });
  }

  async assignSitesToUser(userId: string, siteIds: string[], callerCompanyId: string, callerRole: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(404, 'User not found');
    }
    if (callerRole !== 'SUPER_ADMIN' && user.companyId !== callerCompanyId) {
      throw new AppError(403, 'Access denied to this user');
    }

    // Validate that all sites belong to the user's company
    // This prevents admins from assigning sites from other companies to users
    if (siteIds.length > 0) {
      const sites = await prisma.site.findMany({
        where: {
          id: { in: siteIds },
        },
        select: {
          id: true,
          companyId: true,
        },
      });

      // Check if all sites were found
      if (sites.length !== siteIds.length) {
        throw new AppError(400, 'One or more sites not found');
      }

      // Check if all sites belong to the user's company
      const invalidSites = sites.filter(site => site.companyId !== user.companyId);
      if (invalidSites.length > 0) {
        throw new AppError(403, 'Cannot assign sites from other companies to this user');
      }
    }

    // Delete existing assignments
    await prisma.userSiteAccess.deleteMany({ where: { userId } });

    // Create new assignments
    if (siteIds.length > 0) {
      await prisma.userSiteAccess.createMany({
        data: siteIds.map(siteId => ({
          userId,
          siteId,
        })),
      });
    }
  }

  async getUserSites(userId: string, callerCompanyId: string, callerRole: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
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
    if (callerRole !== 'SUPER_ADMIN' && user.companyId !== callerCompanyId) {
      throw new AppError(403, 'Access denied to this user');
    }

    return user.userSiteAccess.map(access => access.site);
  }

  // ==================== AUDIT LOGS ====================

  async getAuditLogs(
    filters: {
      companyId?: string;
      siteId?: string;
      entityType?: string;
      action?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
    callerCompanyId: string,
    callerRole: string
  ) {
    // ADMIN is always confined to their own company, regardless of what
    // companyId (if any) they passed in. SUPER_ADMIN can see any company,
    // or all of them if none is specified.
    const companyId = callerRole === 'SUPER_ADMIN' ? filters.companyId : callerCompanyId;

    return await auditLogService.getAuditLogs({ ...filters, companyId });
  }
}

export const adminService = new AdminService();
