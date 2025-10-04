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

// Get specific metric by site and period
router.get(
  '/metrics/:siteId/:year/:month',
  asyncHandler(dashboardController.getMetricsBySiteAndPeriod.bind(dashboardController))
);

// Create or update metrics
router.post('/metrics', asyncHandler(dashboardController.upsertMetrics.bind(dashboardController)));

// Get sites for dropdown
router.get('/sites', asyncHandler(dashboardController.getSites.bind(dashboardController)));

export default router;
