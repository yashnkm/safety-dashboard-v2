import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { capaService } from '../services/capa.service';

export class CapaController {
  /**
   * GET /api/capa
   * List corrective actions, filterable by site/status/priority/assignee
   */
  async getCorrectiveActions(req: AuthRequest, res: Response) {
    const { companyId, siteId, status, priority, assignedToId, overdue } = req.query;

    const actions = await capaService.getCorrectiveActions(
      {
        companyId: companyId as string | undefined,
        siteId: siteId as string | undefined,
        status: status as string | undefined,
        priority: priority as string | undefined,
        assignedToId: assignedToId as string | undefined,
        overdue: overdue === 'true',
      },
      req.user!.companyId,
      req.user!.role
    );

    res.json({
      status: 'success',
      data: actions,
    });
  }

  /**
   * GET /api/capa/:id
   */
  async getCorrectiveAction(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const capa = await capaService.getCorrectiveAction(id, req.user!.companyId, req.user!.role);
    res.json({
      status: 'success',
      data: capa,
    });
  }

  /**
   * POST /api/capa
   */
  async createCorrectiveAction(req: AuthRequest, res: Response) {
    const capa = await capaService.createCorrectiveAction(
      req.body,
      req.user!.companyId,
      req.user!.role,
      req.user!.id
    );
    res.status(201).json({
      status: 'success',
      data: capa,
    });
  }

  /**
   * PUT /api/capa/:id
   */
  async updateCorrectiveAction(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const capa = await capaService.updateCorrectiveAction(
      id,
      req.body,
      req.user!.companyId,
      req.user!.role,
      req.user!.id
    );
    res.json({
      status: 'success',
      data: capa,
    });
  }

  /**
   * DELETE /api/capa/:id
   */
  async deleteCorrectiveAction(req: AuthRequest, res: Response) {
    const { id } = req.params;
    await capaService.deleteCorrectiveAction(id, req.user!.companyId, req.user!.role, req.user!.id);
    res.json({
      status: 'success',
      message: 'Corrective action deleted successfully',
    });
  }
}

export const capaController = new CapaController();
