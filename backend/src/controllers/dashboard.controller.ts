import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { safetyMetricsService } from '../services/safetyMetrics.service';
import { AppError } from '../middleware/errorHandler';

export class DashboardController {
  /**
   * GET /api/dashboard/kpi
   * Get KPI summary for dashboard
   */
  async getKPISummary(req: AuthRequest, res: Response) {
    const { siteId, month, year } = req.query;
    const companyId = req.user!.companyId;
    const role = req.user!.role;

    const kpi = await safetyMetricsService.getKPISummary({
      companyId: role === 'SUPER_ADMIN' ? undefined : companyId,
      siteId: siteId as string,
      month: month as string,
      year: year ? parseInt(year as string) : undefined,
    });

    res.json({
      status: 'success',
      data: kpi,
    });
  }

  /**
   * GET /api/dashboard/metrics
   * Get detailed metrics with filters
   */
  async getMetrics(req: AuthRequest, res: Response) {
    const { siteId, month, year } = req.query;
    const companyId = req.user!.companyId;
    const role = req.user!.role;

    const metrics = await safetyMetricsService.getMetrics({
      companyId: role === 'SUPER_ADMIN' ? undefined : companyId,
      siteId: siteId as string,
      month: month as string,
      year: year ? parseInt(year as string) : undefined,
    });

    res.json({
      status: 'success',
      data: metrics,
    });
  }

  /**
   * GET /api/dashboard/metrics/:siteId/:year/:month
   * Get metrics for specific site and period
   */
  async getMetricsBySiteAndPeriod(req: AuthRequest, res: Response) {
    const { siteId, year, month } = req.params;
    const companyId = req.user!.companyId;
    const role = req.user!.role;

    const metric = await safetyMetricsService.getMetricsBySiteAndPeriod(
      role === 'SUPER_ADMIN' ? undefined : companyId,
      siteId,
      month,
      parseInt(year)
    );

    if (!metric) {
      throw new AppError(404, 'Metrics not found for this period');
    }

    res.json({
      status: 'success',
      data: metric,
    });
  }

  /**
   * POST /api/dashboard/metrics
   * Create or update safety metrics
   */
  async upsertMetrics(req: AuthRequest, res: Response) {
    const { siteId, month, year, ...metricsData } = req.body;
    const companyId = req.user!.companyId;

    // Validate required fields
    if (!siteId || !month || !year) {
      throw new AppError(400, 'siteId, month, and year are required');
    }

    const metric = await safetyMetricsService.upsertMetrics(
      companyId,
      siteId,
      month,
      year,
      metricsData
    );

    res.status(201).json({
      status: 'success',
      data: metric,
    });
  }

  /**
   * GET /api/dashboard/sites
   * Get all sites for the user's company (filtered by user access level)
   */
  async getSites(req: AuthRequest, res: Response) {
    const companyId = req.user!.companyId;
    const userId = req.user!.id;
    const accessLevel = req.user!.accessLevel;
    const role = req.user!.role;

    const sites = await safetyMetricsService.getSites(companyId, userId, accessLevel, role);

    res.json({
      status: 'success',
      data: sites,
    });
  }

  /**
   * POST /api/dashboard/metrics/bulk-import
   * Bulk import metrics from Excel file
   */
  async bulkImportMetrics(req: AuthRequest, res: Response) {
    const { siteId, year, metricsData } = req.body;
    const companyId = req.user!.companyId;
    const userId = req.user!.id;
    const accessLevel = req.user!.accessLevel;
    const role = req.user!.role;

    // Validate required fields
    if (!siteId || !year || !metricsData || !Array.isArray(metricsData)) {
      throw new AppError(400, 'siteId, year, and metricsData array are required');
    }

    // Only SUPER_ADMIN and ADMIN can import
    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
      throw new AppError(403, 'Only administrators can import data');
    }

    const result = await safetyMetricsService.bulkImportMetrics(
      companyId,
      siteId,
      year,
      userId,
      role,
      metricsData
    );

    res.status(201).json({
      status: 'success',
      data: result,
    });
  }
}

export const dashboardController = new DashboardController();
