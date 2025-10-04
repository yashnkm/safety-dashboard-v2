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

    const kpi = await safetyMetricsService.getKPISummary({
      companyId,
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

    const metrics = await safetyMetricsService.getMetrics({
      companyId,
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

    const metric = await safetyMetricsService.getMetricsBySiteAndPeriod(
      companyId,
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
   * Get all sites for the user's company
   */
  async getSites(req: AuthRequest, res: Response) {
    const companyId = req.user!.companyId;
    const sites = await safetyMetricsService.getSites(companyId);

    res.json({
      status: 'success',
      data: sites,
    });
  }
}

export const dashboardController = new DashboardController();
