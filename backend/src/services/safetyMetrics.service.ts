import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

interface MetricsFilters {
  companyId: string;
  siteId?: string;
  month?: string;
  year?: number;
}

export class SafetyMetricsService {
  /**
   * Get KPI summary for dashboard
   */
  async getKPISummary(filters: MetricsFilters) {
    const { companyId, siteId, month, year } = filters;

    // Build where clause
    const where: any = {
      site: { companyId },
    };

    if (siteId && siteId !== 'all') {
      where.siteId = siteId;
    }

    if (month) {
      where.month = month;
    }

    if (year) {
      where.year = year;
    }

    // Get aggregated metrics
    const metrics = await prisma.safetyMetrics.findMany({
      where,
      select: {
        manDaysActual: true,
        safeWorkHoursActual: true,
        lostTimeInjuryActual: true,
        nearMissReportActual: true,
      },
    });

    // Calculate totals
    const totals = metrics.reduce(
      (acc: any, metric: any) => ({
        manDays: acc.manDays + metric.manDaysActual,
        safeWorkHours: acc.safeWorkHours + metric.safeWorkHoursActual,
        lostTimeInjuries: acc.lostTimeInjuries + metric.lostTimeInjuryActual,
        nearMissReports: acc.nearMissReports + metric.nearMissReportActual,
      }),
      { manDays: 0, safeWorkHours: 0, lostTimeInjuries: 0, nearMissReports: 0 }
    );

    return totals;
  }

  /**
   * Get detailed metrics for a specific period
   */
  async getMetrics(filters: MetricsFilters) {
    const { companyId, siteId, month, year } = filters;

    const where: any = {
      site: { companyId },
    };

    if (siteId && siteId !== 'all') {
      where.siteId = siteId;
    }

    if (month) {
      where.month = month;
    }

    if (year) {
      where.year = year;
    }

    const metrics = await prisma.safetyMetrics.findMany({
      where,
      include: {
        site: {
          select: {
            siteName: true,
            siteCode: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return metrics;
  }

  /**
   * Get metrics for a specific site and period
   */
  async getMetricsBySiteAndPeriod(
    companyId: string,
    siteId: string,
    month: string,
    year: number
  ) {
    const metric = await prisma.safetyMetrics.findUnique({
      where: {
        siteId_month_year: {
          siteId,
          month,
          year,
        },
      },
      include: {
        site: {
          select: {
            siteName: true,
            siteCode: true,
            companyId: true,
          },
        },
      },
    });

    // Verify the metric belongs to the user's company
    if (metric && metric.site.companyId !== companyId) {
      throw new AppError(403, 'Access denied to this metric');
    }

    return metric;
  }

  /**
   * Create or update safety metrics
   */
  async upsertMetrics(
    companyId: string,
    siteId: string,
    month: string,
    year: number,
    data: any
  ) {
    // Verify site belongs to company
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { companyId: true },
    });

    if (!site || site.companyId !== companyId) {
      throw new AppError(403, 'Access denied to this site');
    }

    // Calculate scores based on company settings
    const settings = await prisma.companySettings.findUnique({
      where: { companyId },
    });

    if (!settings) {
      throw new AppError(404, 'Company settings not found');
    }

    // Calculate total score (simplified - you can enhance this)
    const totalScore = this.calculateTotalScore(data, settings);
    const percentage = (totalScore / 100) * 100;
    const rating = this.getRating(percentage);

    // Upsert metrics
    const metric = await prisma.safetyMetrics.upsert({
      where: {
        siteId_month_year: {
          siteId,
          month,
          year,
        },
      },
      update: {
        ...data,
        totalScore,
        percentage,
        rating,
        updatedAt: new Date(),
      },
      create: {
        siteId,
        month,
        year,
        ...data,
        totalScore,
        percentage,
        rating,
      },
      include: {
        site: {
          select: {
            siteName: true,
            siteCode: true,
          },
        },
      },
    });

    return metric;
  }

  /**
   * Calculate total score based on all parameters
   */
  private calculateTotalScore(data: any, settings: any): number {
    // This is a simplified calculation
    // You can enhance this based on your business logic
    let totalScore = 0;
    let count = 0;

    // List of all score fields
    const scoreFields = [
      'manDaysScore',
      'safeWorkHoursScore',
      'safetyInductionScore',
      'toolboxTalkScore',
      'jobSpecificTrainingScore',
      'formalSafetyInspectionScore',
      'nonComplianceRaisedScore',
      'nonComplianceCloseScore',
      'safetyObservationRaisedScore',
      'safetyObservationCloseScore',
      'workPermitIssuedScore',
      'safeWorkMethodStatementScore',
      'emergencyMockDrillsScore',
      'internalAuditScore',
      'nearMissReportScore',
      'firstAidInjuryScore',
      'medicalTreatmentInjuryScore',
      'lostTimeInjuryScore',
    ];

    scoreFields.forEach((field) => {
      if (data[field] !== undefined && data[field] !== null) {
        totalScore += Number(data[field]);
        count++;
      }
    });

    return count > 0 ? totalScore / count : 0;
  }

  /**
   * Get rating based on percentage
   */
  private getRating(percentage: number): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' {
    if (percentage >= 90) return 'EXCELLENT';
    if (percentage >= 75) return 'GOOD';
    if (percentage >= 60) return 'FAIR';
    return 'POOR';
  }

  /**
   * Get all sites for a company (for filter dropdown)
   */
  async getSites(companyId: string) {
    const sites = await prisma.site.findMany({
      where: { companyId, isActive: true },
      select: {
        id: true,
        siteName: true,
        siteCode: true,
      },
      orderBy: { siteName: 'asc' },
    });

    return sites;
  }
}

export const safetyMetricsService = new SafetyMetricsService();
