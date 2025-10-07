import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

interface MetricsFilters {
  companyId?: string;
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
    const where: any = {};

    // Only filter by company if companyId is provided (not SUPER_ADMIN)
    if (companyId) {
      where.site = { companyId };
    }

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

    const where: any = {};

    // Only filter by company if companyId is provided (not SUPER_ADMIN)
    if (companyId) {
      where.site = { companyId };
    }

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

    // Calculate totalScore, percentage, and rating dynamically for each metric
    return metrics.map((metric) => {
      const calculatedScores = this.calculateMetricScores(metric);
      return {
        ...metric,
        totalScore: calculatedScores.totalScore,
        percentage: calculatedScores.percentage,
        rating: calculatedScores.rating,
        maxScore: 100,
      };
    });
  }

  /**
   * Get metrics for a specific site and period
   */
  async getMetricsBySiteAndPeriod(
    companyId: string | undefined,
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

    // Verify the metric belongs to the user's company (only if companyId is provided - not SUPER_ADMIN)
    if (companyId && metric && metric.site.companyId !== companyId) {
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

    // Calculate total score
    const totalScore = this.calculateTotalScore(data);
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
   * Parameter weights - defines max points for each parameter (total = 100 points)
   */
  private readonly PARAMETER_WEIGHTS = {
    // Critical Incidents (40 points total) - Binary scoring
    nearMissReport: 10,
    firstAidInjury: 10,
    medicalTreatmentInjury: 10,
    lostTimeInjury: 10,

    // Compliance Issues (5 points) - Binary scoring
    nonComplianceRaised: 5,

    // High Priority Performance (45 points total) - Ratio scoring
    manDays: 5,
    safeWorkHours: 5,
    safetyInduction: 5,
    toolBoxTalk: 5,
    jobSpecificTraining: 5,
    formalSafetyInspection: 5,
    emergencyMockDrills: 5,
    internalAudit: 5,
    safetyObservationRaised: 5,

    // Standard Priority (10 points total) - Ratio scoring
    nonComplianceClose: 2.5,
    safetyObservationClose: 2.5,
    workPermitIssued: 2.5,
    safeWorkMethodStatement: 2.5,
  };

  /**
   * Calculate individual parameter score based on target, actual values, and weight
   * Uses Excel-style binary scoring for incidents
   */
  private calculateParameterScore(
    target: number,
    actual: number,
    weight: number,
    isIncident: boolean = false
  ): number {
    // For incident metrics (target should be 0, lower actual is better)
    // Binary scoring: 0 incidents = full weight, any incident = 0 points
    if (isIncident || target === 0) {
      return actual === 0 ? weight : 0;
    }

    // For positive metrics (higher actual is better)
    // Ratio-based scoring with max = weight
    if (target === 0) return 0; // Avoid division by zero

    const ratio = actual / target;
    const score = ratio * weight;
    return Math.min(score, weight); // Cap at max weight
  }

  /**
   * Calculate totalScore, percentage, and rating from individual parameter scores
   * Uses weighted sum (not average) matching Excel logic
   */
  private calculateMetricScores(metric: any): { totalScore: number; percentage: number; rating: 'LOW' | 'MEDIUM' | 'HIGH' } {
    // Calculate weighted sum of all parameter scores
    // Note: Scores in DB are stored as 0-10 for backward compatibility,
    // but we need to convert them to weighted values

    let totalScore = 0;

    // Critical Incidents (40 points max) - stored as 0-10, multiply by weight/10
    totalScore += Number(metric.nearMissReportScore || 0) * (this.PARAMETER_WEIGHTS.nearMissReport / 10);
    totalScore += Number(metric.firstAidInjuryScore || 0) * (this.PARAMETER_WEIGHTS.firstAidInjury / 10);
    totalScore += Number(metric.medicalTreatmentInjuryScore || 0) * (this.PARAMETER_WEIGHTS.medicalTreatmentInjury / 10);
    totalScore += Number(metric.lostTimeInjuryScore || 0) * (this.PARAMETER_WEIGHTS.lostTimeInjury / 10);

    // Compliance Issues (5 points max)
    totalScore += Number(metric.nonComplianceRaisedScore || 0) * (this.PARAMETER_WEIGHTS.nonComplianceRaised / 10);

    // High Priority Performance (45 points max)
    totalScore += Number(metric.manDaysScore || 0) * (this.PARAMETER_WEIGHTS.manDays / 10);
    totalScore += Number(metric.safeWorkHoursScore || 0) * (this.PARAMETER_WEIGHTS.safeWorkHours / 10);
    totalScore += Number(metric.safetyInductionScore || 0) * (this.PARAMETER_WEIGHTS.safetyInduction / 10);
    totalScore += Number(metric.toolBoxTalkScore || 0) * (this.PARAMETER_WEIGHTS.toolBoxTalk / 10);
    totalScore += Number(metric.jobSpecificTrainingScore || 0) * (this.PARAMETER_WEIGHTS.jobSpecificTraining / 10);
    totalScore += Number(metric.formalSafetyInspectionScore || 0) * (this.PARAMETER_WEIGHTS.formalSafetyInspection / 10);
    totalScore += Number(metric.emergencyMockDrillsScore || 0) * (this.PARAMETER_WEIGHTS.emergencyMockDrills / 10);
    totalScore += Number(metric.internalAuditScore || 0) * (this.PARAMETER_WEIGHTS.internalAudit / 10);
    totalScore += Number(metric.safetyObservationRaisedScore || 0) * (this.PARAMETER_WEIGHTS.safetyObservationRaised / 10);

    // Standard Priority (10 points max)
    totalScore += Number(metric.nonComplianceCloseScore || 0) * (this.PARAMETER_WEIGHTS.nonComplianceClose / 10);
    totalScore += Number(metric.safetyObservationCloseScore || 0) * (this.PARAMETER_WEIGHTS.safetyObservationClose / 10);
    totalScore += Number(metric.workPermitIssuedScore || 0) * (this.PARAMETER_WEIGHTS.workPermitIssued / 10);
    totalScore += Number(metric.safeWorkMethodStatementScore || 0) * (this.PARAMETER_WEIGHTS.safeWorkMethodStatement / 10);

    // Total is already a percentage (0-100 scale)
    const percentage = totalScore;

    // Determine rating based on percentage (matching Excel: Low 0-30, Medium 31-70, High 71-100)
    let rating: 'LOW' | 'MEDIUM' | 'HIGH';
    if (percentage >= 71) {
      rating = 'HIGH';
    } else if (percentage >= 31) {
      rating = 'MEDIUM';
    } else {
      rating = 'LOW';
    }

    return {
      totalScore: percentage,
      percentage,
      rating,
    };
  }

  /**
   * Calculate total score based on all parameters
   */
  private calculateTotalScore(data: any): number {
    // Use the new calculation method
    const metric = { ...data };
    const calculated = this.calculateMetricScores(metric);
    return calculated.totalScore;
  }

  /**
   * Get rating based on percentage
   * Matches the Rating enum: LOW, MEDIUM, HIGH
   */
  private getRating(percentage: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (percentage >= 71) return 'HIGH';
    if (percentage >= 31) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Get all sites for a company (for filter dropdown)
   */
  async getSites(companyId: string, userId?: string, accessLevel?: string, role?: string) {
    // SUPER_ADMIN can see all sites from all companies
    if (role === 'SUPER_ADMIN') {
      const sites = await prisma.site.findMany({
        where: { isActive: true },
        select: {
          id: true,
          siteName: true,
          siteCode: true,
          company: {
            select: {
              companyName: true,
            },
          },
        },
        orderBy: { siteName: 'asc' },
      });

      return sites;
    }

    // If user has SPECIFIC_SITES access, only return sites they have access to
    if (accessLevel === 'SPECIFIC_SITES' && userId) {
      const userSiteAccess = await prisma.userSiteAccess.findMany({
        where: { userId },
        include: {
          site: {
            select: {
              id: true,
              siteName: true,
              siteCode: true,
              isActive: true,
            },
          },
        },
      });

      // Filter out inactive sites and map to site objects
      return userSiteAccess
        .map(access => access.site)
        .filter(site => site.isActive)
        .sort((a, b) => a.siteName.localeCompare(b.siteName));
    }

    // For ALL_SITES access or ADMIN, return all active sites for the company
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

  /**
   * Bulk import metrics from Excel
   */
  async bulkImportMetrics(
    companyId: string,
    siteId: string,
    year: number,
    userId: string,
    role: string,
    metricsData: any[]
  ) {
    // Verify site exists
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { companyId: true },
    });

    if (!site) {
      throw new AppError(404, 'Site not found');
    }

    // SUPER_ADMIN can import to any site
    // ADMIN can only import to sites in their company
    if (role !== 'SUPER_ADMIN' && site.companyId !== companyId) {
      throw new AppError(403, 'Access denied to this site');
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    // Process each month's data
    for (const monthData of metricsData) {
      try {
        const { month, ...data } = monthData;

        if (!month) {
          results.failed++;
          results.errors.push({ month: 'unknown', error: 'Month is required' });
          continue;
        }

        // Calculate individual parameter scores
        const processedData = this.calculateAllParameterScores(data);

        // Calculate total score
        const totalScore = this.calculateTotalScore(processedData);
        const percentage = (totalScore / 100) * 100;
        const rating = this.getRating(percentage);

        // Upsert metrics
        await prisma.safetyMetrics.upsert({
          where: {
            siteId_month_year: {
              siteId,
              month,
              year,
            },
          },
          update: {
            ...processedData,
            totalScore,
            percentage,
            rating,
            createdBy: userId,
            updatedAt: new Date(),
          },
          create: {
            siteId,
            month,
            year,
            ...processedData,
            totalScore,
            percentage,
            rating,
            createdBy: userId,
          },
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          month: monthData.month,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Calculate scores for all parameters with proper weights
   */
  private calculateAllParameterScores(data: any): any {
    const processedData: any = {};

    // Define parameter mappings (field name -> weight -> isIncident flag)
    const parameters = [
      // High Priority Performance (5 pts each)
      { target: 'manDaysTarget', actual: 'manDaysActual', score: 'manDaysScore', weight: this.PARAMETER_WEIGHTS.manDays, isIncident: false },
      { target: 'safeWorkHoursTarget', actual: 'safeWorkHoursActual', score: 'safeWorkHoursScore', weight: this.PARAMETER_WEIGHTS.safeWorkHours, isIncident: false },
      { target: 'safetyInductionTarget', actual: 'safetyInductionActual', score: 'safetyInductionScore', weight: this.PARAMETER_WEIGHTS.safetyInduction, isIncident: false },
      { target: 'toolBoxTalkTarget', actual: 'toolBoxTalkActual', score: 'toolBoxTalkScore', weight: this.PARAMETER_WEIGHTS.toolBoxTalk, isIncident: false },
      { target: 'jobSpecificTrainingTarget', actual: 'jobSpecificTrainingActual', score: 'jobSpecificTrainingScore', weight: this.PARAMETER_WEIGHTS.jobSpecificTraining, isIncident: false },
      { target: 'formalSafetyInspectionTarget', actual: 'formalSafetyInspectionActual', score: 'formalSafetyInspectionScore', weight: this.PARAMETER_WEIGHTS.formalSafetyInspection, isIncident: false },
      { target: 'emergencyMockDrillsTarget', actual: 'emergencyMockDrillsActual', score: 'emergencyMockDrillsScore', weight: this.PARAMETER_WEIGHTS.emergencyMockDrills, isIncident: false },
      { target: 'internalAuditTarget', actual: 'internalAuditActual', score: 'internalAuditScore', weight: this.PARAMETER_WEIGHTS.internalAudit, isIncident: false },
      { target: 'safetyObservationRaisedTarget', actual: 'safetyObservationRaisedActual', score: 'safetyObservationRaisedScore', weight: this.PARAMETER_WEIGHTS.safetyObservationRaised, isIncident: false },

      // Standard Priority (2.5 pts each)
      { target: 'nonComplianceCloseTarget', actual: 'nonComplianceCloseActual', score: 'nonComplianceCloseScore', weight: this.PARAMETER_WEIGHTS.nonComplianceClose, isIncident: false },
      { target: 'safetyObservationCloseTarget', actual: 'safetyObservationCloseActual', score: 'safetyObservationCloseScore', weight: this.PARAMETER_WEIGHTS.safetyObservationClose, isIncident: false },
      { target: 'workPermitIssuedTarget', actual: 'workPermitIssuedActual', score: 'workPermitIssuedScore', weight: this.PARAMETER_WEIGHTS.workPermitIssued, isIncident: false },
      { target: 'safeWorkMethodStatementTarget', actual: 'safeWorkMethodStatementActual', score: 'safeWorkMethodStatementScore', weight: this.PARAMETER_WEIGHTS.safeWorkMethodStatement, isIncident: false },

      // Compliance Issues (5 pts) - Binary
      { target: 'nonComplianceRaisedTarget', actual: 'nonComplianceRaisedActual', score: 'nonComplianceRaisedScore', weight: this.PARAMETER_WEIGHTS.nonComplianceRaised, isIncident: true },

      // Critical Incidents (10 pts each) - Binary
      { target: 'nearMissReportTarget', actual: 'nearMissReportActual', score: 'nearMissReportScore', weight: this.PARAMETER_WEIGHTS.nearMissReport, isIncident: true },
      { target: 'firstAidInjuryTarget', actual: 'firstAidInjuryActual', score: 'firstAidInjuryScore', weight: this.PARAMETER_WEIGHTS.firstAidInjury, isIncident: true },
      { target: 'medicalTreatmentInjuryTarget', actual: 'medicalTreatmentInjuryActual', score: 'medicalTreatmentInjuryScore', weight: this.PARAMETER_WEIGHTS.medicalTreatmentInjury, isIncident: true },
      { target: 'lostTimeInjuryTarget', actual: 'lostTimeInjuryActual', score: 'lostTimeInjuryScore', weight: this.PARAMETER_WEIGHTS.lostTimeInjury, isIncident: true },
    ];

    // Process each parameter
    parameters.forEach(({ target, actual, score, weight, isIncident }) => {
      if (data[target] !== undefined && data[actual] !== undefined) {
        const targetVal = Number(data[target]) || 0;
        const actualVal = Number(data[actual]) || 0;

        processedData[target] = targetVal;
        processedData[actual] = actualVal;

        // Calculate weighted score but store as 0-10 for DB compatibility
        const weightedScore = this.calculateParameterScore(targetVal, actualVal, weight, isIncident);
        // Convert back to 0-10 scale for storage (will be converted back when calculating total)
        processedData[score] = (weightedScore / weight) * 10;
      }
    });

    return processedData;
  }
}

export const safetyMetricsService = new SafetyMetricsService();

