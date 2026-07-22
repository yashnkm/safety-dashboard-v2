import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { cleanupOrphanedLogos } from './logoCleanup.service';
import { safetyMetricsService } from './safetyMetrics.service';
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

    if (!settings) {
      return { companyId, isCustom: false, weights: safetyMetricsService.getDefaultWeights() };
    }

    const weights: Record<string, number> = {};
    for (const [paramKey, dbField] of fieldMap) {
      weights[paramKey] = Number((settings as any)[dbField]);
    }

    return { companyId, isCustom: true, weights, updatedAt: settings.updatedAt };
  }

  async updateCompanySettings(
    companyId: string,
    weights: Record<string, number>,
    callerCompanyId: string,
    callerRole: string,
    userId: string
  ) {
    if (callerRole !== 'SUPER_ADMIN' && companyId !== callerCompanyId) {
      throw new AppError(403, 'Access denied to this company');
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new AppError(404, 'Company not found');
    }

    const fieldMap = safetyMetricsService.getWeightFieldMap();
    const dbData: Record<string, number> = {};
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

    return await prisma.companySettings.upsert({
      where: { companyId },
      update: { ...dbData, updatedBy: userId },
      create: { companyId, ...dbData, updatedBy: userId },
    });
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

  async createUser(data: any) {
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

    const updateData: any = {
      fullName: data.fullName,
      role: data.role,
      accessLevel: data.accessLevel,
      isActive: data.isActive,
    };

    // Only update password if provided
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
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
