import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { auditLogService } from './auditLog.service';
import { alertService } from './alert.service';

const CAPA_INCLUDE = {
  site: { select: { siteName: true, siteCode: true } },
  assignedTo: { select: { fullName: true, email: true } },
  createdBy: { select: { fullName: true, email: true } },
  closedBy: { select: { fullName: true, email: true } },
} as const;

export class CapaService {
  async getCorrectiveActions(
    filters: {
      companyId?: string;
      siteId?: string;
      status?: string;
      priority?: string;
      assignedToId?: string;
      overdue?: boolean;
    },
    callerCompanyId: string,
    callerRole: string
  ) {
    // ADMIN/MANAGER/VIEWER are always confined to their own company;
    // SUPER_ADMIN can see any company, or all of them if none is specified.
    const companyId = callerRole === 'SUPER_ADMIN' ? filters.companyId : callerCompanyId;

    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (filters.siteId) where.siteId = filters.siteId;
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.overdue) {
      where.status = { not: 'CLOSED' };
      where.dueDate = { lt: new Date() };
    }

    return await prisma.correctiveAction.findMany({
      where,
      include: CAPA_INCLUDE,
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getCorrectiveAction(id: string, callerCompanyId: string, callerRole: string) {
    const capa = await prisma.correctiveAction.findUnique({
      where: { id },
      include: CAPA_INCLUDE,
    });
    if (!capa) {
      throw new AppError(404, 'Corrective action not found');
    }
    if (callerRole !== 'SUPER_ADMIN' && capa.companyId !== callerCompanyId) {
      throw new AppError(403, 'Access denied to this corrective action');
    }
    return capa;
  }

  async createCorrectiveAction(
    data: any,
    callerCompanyId: string,
    callerRole: string,
    userId: string
  ) {
    if (!data.title) {
      throw new AppError(400, 'title is required');
    }

    const companyId = callerRole === 'SUPER_ADMIN' && data.companyId ? data.companyId : callerCompanyId;

    if (data.siteId) {
      const site = await prisma.site.findUnique({ where: { id: data.siteId } });
      if (!site) {
        throw new AppError(404, 'Site not found');
      }
      if (site.companyId !== companyId) {
        throw new AppError(403, 'Site does not belong to this company');
      }
    }

    const capa = await prisma.correctiveAction.create({
      data: {
        companyId,
        siteId: data.siteId || null,
        title: data.title,
        description: data.description || null,
        linkedParameter: data.linkedParameter || null,
        linkedMonth: data.linkedMonth || null,
        linkedYear: data.linkedYear ? Number(data.linkedYear) : null,
        priority: data.priority || 'MEDIUM',
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        rootCause: data.rootCause || null,
        correctiveAction: data.correctiveAction || null,
        assignedToId: data.assignedToId || null,
        createdById: userId,
      },
      include: CAPA_INCLUDE,
    });

    await auditLogService.logChange({
      companyId,
      siteId: capa.siteId,
      userId,
      action: 'create',
      entityType: 'CorrectiveAction',
      entityId: capa.id,
      oldValues: null,
      newValues: data,
    });

    await alertService.notifyIfHighPriorityCapa(companyId, capa);

    return capa;
  }

  async updateCorrectiveAction(
    id: string,
    data: any,
    callerCompanyId: string,
    callerRole: string,
    userId: string
  ) {
    const existing = await prisma.correctiveAction.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'Corrective action not found');
    }
    if (callerRole !== 'SUPER_ADMIN' && existing.companyId !== callerCompanyId) {
      throw new AppError(403, 'Access denied to this corrective action');
    }

    if (data.siteId) {
      const site = await prisma.site.findUnique({ where: { id: data.siteId } });
      if (!site || site.companyId !== existing.companyId) {
        throw new AppError(400, 'Site does not belong to this corrective action\'s company');
      }
    }

    const isClosing = data.status === 'CLOSED' && existing.status !== 'CLOSED';
    const isReopening = data.status && data.status !== 'CLOSED' && existing.status === 'CLOSED';

    const updated = await prisma.correctiveAction.update({
      where: { id },
      data: {
        title: data.title ?? existing.title,
        description: data.description !== undefined ? data.description : existing.description,
        siteId: data.siteId !== undefined ? data.siteId : existing.siteId,
        priority: data.priority ?? existing.priority,
        status: data.status ?? existing.status,
        dueDate:
          data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : existing.dueDate,
        rootCause: data.rootCause !== undefined ? data.rootCause : existing.rootCause,
        correctiveAction:
          data.correctiveAction !== undefined ? data.correctiveAction : existing.correctiveAction,
        closureNotes: data.closureNotes !== undefined ? data.closureNotes : existing.closureNotes,
        assignedToId: data.assignedToId !== undefined ? data.assignedToId : existing.assignedToId,
        ...(isClosing ? { closedAt: new Date(), closedById: userId } : {}),
        ...(isReopening ? { closedAt: null, closedById: null } : {}),
      },
      include: CAPA_INCLUDE,
    });

    await auditLogService.logChange({
      companyId: existing.companyId,
      siteId: updated.siteId,
      userId,
      action: isClosing ? 'close' : isReopening ? 'reopen' : 'update',
      entityType: 'CorrectiveAction',
      entityId: id,
      oldValues: existing,
      newValues: data,
    });

    return updated;
  }

  async deleteCorrectiveAction(id: string, callerCompanyId: string, callerRole: string, userId: string) {
    const existing = await prisma.correctiveAction.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'Corrective action not found');
    }
    if (callerRole !== 'SUPER_ADMIN' && existing.companyId !== callerCompanyId) {
      throw new AppError(403, 'Access denied to this corrective action');
    }

    await prisma.correctiveAction.delete({ where: { id } });

    await auditLogService.logChange({
      companyId: existing.companyId,
      siteId: existing.siteId,
      userId,
      action: 'delete',
      entityType: 'CorrectiveAction',
      entityId: id,
      oldValues: existing,
      newValues: null,
    });
  }
}

export const capaService = new CapaService();
