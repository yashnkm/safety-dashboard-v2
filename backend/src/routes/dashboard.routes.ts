import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// All dashboard routes require authentication
router.use(authenticate);

// KPI summary
router.get('/kpi', asyncHandler(dashboardController.getKPISummary.bind(dashboardController)));

// Get all metrics with filters
router.get('/metrics', asyncHandler(dashboardController.getMetrics.bind(dashboardController)));

// Real "All Sites" aggregation - must come before the /:siteId/:year/:month
// route below, otherwise Express would match "aggregate" as a siteId.
router.get(
  '/metrics/aggregate',
  asyncHandler(dashboardController.getAggregatedMetrics.bind(dashboardController))
);

// Combined metrics across an arbitrary set of periods (Quarterly/Half-Yearly/
// Annual/Custom views) - must also come before the /:siteId/:year/:month
// route below, same reasoning as /metrics/aggregate above.
router.get(
  '/metrics/combined',
  asyncHandler(dashboardController.getCombinedMetrics.bind(dashboardController))
);

// Get specific metric by site and period
router.get(
  '/metrics/:siteId/:year/:month',
  asyncHandler(dashboardController.getMetricsBySiteAndPeriod.bind(dashboardController))
);

// Create or update metrics
router.post('/metrics', asyncHandler(dashboardController.upsertMetrics.bind(dashboardController)));

// Get sites for dropdown
router.get('/sites', asyncHandler(dashboardController.getSites.bind(dashboardController)));

// Bulk import metrics from Excel
router.post('/metrics/bulk-import', asyncHandler(dashboardController.bulkImportMetrics.bind(dashboardController)));

export default router;
