import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
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

    return await prisma.company.update({
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
  }

  async deleteCompany(id: string) {
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      throw new AppError(404, 'Company not found');
    }

    await prisma.company.delete({ where: { id } });
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

  async updateSite(id: string, data: any) {
    const site = await prisma.site.findUnique({ where: { id } });
    if (!site) {
      throw new AppError(404, 'Site not found');
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

  async deleteSite(id: string) {
    const site = await prisma.site.findUnique({ where: { id } });
    if (!site) {
      throw new AppError(404, 'Site not found');
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

  async updateUser(id: string, data: any) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError(404, 'User not found');
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

  async deleteUser(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    await prisma.user.delete({ where: { id } });
  }

  async assignSitesToUser(userId: string, siteIds: string[]) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(404, 'User not found');
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

  async getUserSites(userId: string) {
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

    return user.userSiteAccess.map(access => access.site);
  }
}

export const adminService = new AdminService();
