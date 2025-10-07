import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { adminService } from '../services/admin.service';
import { AppError } from '../middleware/errorHandler';

export class AdminController {
  // ==================== COMPANIES ====================

  /**
   * GET /api/admin/companies
   * Get all companies (SUPER_ADMIN only)
   */
  async getAllCompanies(req: AuthRequest, res: Response) {
    const companies = await adminService.getAllCompanies();
    res.json({
      status: 'success',
      data: companies,
    });
  }

  /**
   * POST /api/admin/companies
   * Create a new company (SUPER_ADMIN only)
   */
  async createCompany(req: AuthRequest, res: Response) {
    const data = req.body;
    const company = await adminService.createCompany(data);
    res.status(201).json({
      status: 'success',
      data: company,
    });
  }

  /**
   * PUT /api/admin/companies/:id
   * Update a company
   */
  async updateCompany(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const data = req.body;
    const company = await adminService.updateCompany(id, data);
    res.json({
      status: 'success',
      data: company,
    });
  }

  /**
   * DELETE /api/admin/companies/:id
   * Delete a company (SUPER_ADMIN only)
   */
  async deleteCompany(req: AuthRequest, res: Response) {
    const { id } = req.params;
    await adminService.deleteCompany(id);
    res.json({
      status: 'success',
      message: 'Company deleted successfully',
    });
  }

  // ==================== SITES ====================

  /**
   * GET /api/admin/sites
   * Get all sites for a company
   */
  async getSites(req: AuthRequest, res: Response) {
    const companyId = req.user!.role === 'SUPER_ADMIN'
      ? req.query.companyId as string
      : req.user!.companyId;

    const sites = await adminService.getSites(companyId);
    res.json({
      status: 'success',
      data: sites,
    });
  }

  /**
   * POST /api/admin/sites
   * Create a new site
   */
  async createSite(req: AuthRequest, res: Response) {
    const data = req.body;
    const companyId = req.user!.role === 'SUPER_ADMIN'
      ? data.companyId
      : req.user!.companyId;

    const site = await adminService.createSite({ ...data, companyId });
    res.status(201).json({
      status: 'success',
      data: site,
    });
  }

  /**
   * PUT /api/admin/sites/:id
   * Update a site
   */
  async updateSite(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const data = req.body;
    const site = await adminService.updateSite(id, data);
    res.json({
      status: 'success',
      data: site,
    });
  }

  /**
   * DELETE /api/admin/sites/:id
   * Delete a site
   */
  async deleteSite(req: AuthRequest, res: Response) {
    const { id } = req.params;
    await adminService.deleteSite(id);
    res.json({
      status: 'success',
      message: 'Site deleted successfully',
    });
  }

  // ==================== USERS ====================

  /**
   * GET /api/admin/users
   * Get all users for a company
   */
  async getUsers(req: AuthRequest, res: Response) {
    const companyId = req.user!.role === 'SUPER_ADMIN'
      ? req.query.companyId as string
      : req.user!.companyId;

    const users = await adminService.getUsers(companyId);
    res.json({
      status: 'success',
      data: users,
    });
  }

  /**
   * POST /api/admin/users
   * Create a new user
   */
  async createUser(req: AuthRequest, res: Response) {
    const data = req.body;
    const companyId = req.user!.role === 'SUPER_ADMIN'
      ? data.companyId
      : req.user!.companyId;

    const user = await adminService.createUser({ ...data, companyId });
    res.status(201).json({
      status: 'success',
      data: user,
    });
  }

  /**
   * PUT /api/admin/users/:id
   * Update a user
   */
  async updateUser(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const data = req.body;
    const user = await adminService.updateUser(id, data);
    res.json({
      status: 'success',
      data: user,
    });
  }

  /**
   * DELETE /api/admin/users/:id
   * Delete a user
   */
  async deleteUser(req: AuthRequest, res: Response) {
    const { id } = req.params;
    await adminService.deleteUser(id);
    res.json({
      status: 'success',
      message: 'User deleted successfully',
    });
  }

  /**
   * POST /api/admin/users/:id/sites
   * Assign sites to a user
   */
  async assignSitesToUser(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { siteIds } = req.body;

    if (!Array.isArray(siteIds)) {
      throw new AppError(400, 'siteIds must be an array');
    }

    await adminService.assignSitesToUser(id, siteIds);
    res.json({
      status: 'success',
      message: 'Sites assigned successfully',
    });
  }

  /**
   * GET /api/admin/users/:id/sites
   * Get sites assigned to a user
   */
  async getUserSites(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const sites = await adminService.getUserSites(id);
    res.json({
      status: 'success',
      data: sites,
    });
  }
}

export const adminController = new AdminController();
