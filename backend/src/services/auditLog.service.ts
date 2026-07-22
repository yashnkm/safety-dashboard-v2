import prisma from '../config/database';

interface LogChangeParams {
  companyId: string;
  siteId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuditLogService {
  /**
   * Records who changed what, when. Never allowed to fail the operation it's
   * recording — a broken audit write shouldn't block a real data save.
   */
  async logChange(params: LogChangeParams): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          companyId: params.companyId,
          siteId: params.siteId ?? undefined,
          userId: params.userId ?? undefined,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId ?? undefined,
          oldValues: params.oldValues ?? undefined,
          newValues: params.newValues ?? undefined,
          ipAddress: params.ipAddress ?? undefined,
          userAgent: params.userAgent ?? undefined,
        },
      });
    } catch (err) {
      console.error('Failed to write audit log:', err);
    }
  }

  async getAuditLogs(filters: {
    companyId?: string;
    siteId?: string;
    entityType?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.siteId) where.siteId = filters.siteId;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.action) where.action = filters.action;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const limit = Math.min(filters.limit ?? 50, 200);
    const offset = filters.offset ?? 0;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { fullName: true, email: true } },
          site: { select: { siteName: true, siteCode: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total, limit, offset };
  }
}

export const auditLogService = new AuditLogService();
