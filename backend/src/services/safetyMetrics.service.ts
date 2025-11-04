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

    // Calculate totalScore, percentage, rating, and KPIs dynamically for each metric
    return metrics.map((metric) => {
      const calculatedScores = this.calculateMetricScores(metric);
      const kpis = this.calculateKPIs(metric);
      return {
        ...metric,
        totalScore: calculatedScores.totalScore,
        percentage: calculatedScores.percentage,
        rating: calculatedScores.rating,
        maxScore: 100,
        kpis, // Add calculated KPIs
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

    // Add calculated KPIs if metric exists
    if (metric) {
      const kpis = this.calculateKPIs(metric);
      return {
        ...metric,
        kpis,
      };
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
   * Parameter weights - defines max points for each parameter (total = 100 points exactly)
   *
   * Weight Distribution:
   * - Critical Incidents: 40 points (8 pts each × 5 params)
   * - Compliance: 4 points
   * - Core Performance: 24 points (2 pts each × 12 params)
   * - Documentation: 4 points (1 pt each × 4 params)
   * - PPE: 4 points (2 pts each × 2 params)
   * - Training Mgmt: 4 points (2 pts each × 2 params)
   * - Environment: 12 points (2 pts each × 6 params)
   * - Health: 4 points (2 pts each × 2 params)
   * - Observations: 4 points (2 pts each × 2 params)
   * Total = 100 points
   */
  private readonly PARAMETER_WEIGHTS = {
    // Critical Incidents (40 points total) - Binary scoring
    nearMissReport: 8,
    firstAidInjury: 8,
    medicalTreatmentInjury: 8,
    lostTimeInjury: 8,
    recordableIncidents: 8, // NEW

    // Compliance Issues (4 points) - Binary scoring
    nonComplianceRaised: 4,

    // Core Performance (24 points total) - Ratio scoring
    manDays: 2,
    safeWorkHours: 2,
    safetyInduction: 2,
    toolBoxTalk: 2,
    jobSpecificTraining: 2,
    formalSafetyInspection: 2,
    emergencyMockDrills: 2,
    internalAudit: 2,
    safetyObservationRaised: 2,
    workforceTrainedPercent: 2, // NEW
    ppeObservations: 2, // NEW
    upcomingTrainings: 2, // NEW

    // Documentation (4 points total) - Ratio scoring
    nonComplianceClose: 1,
    safetyObservationClose: 1,
    workPermitIssued: 1,
    safeWorkMethodStatement: 1,

    // PPE Compliance (2 points) - NEW
    ppeComplianceRate: 2,

    // Training Management (2 points) - NEW
    overdueTrainings: 2, // Binary: 0 = full points, any > 0 = 0 points

    // Environment Metrics (12 points total) - NEW
    wasteGenerated: 2, // Lower is better
    wasteDisposed: 2,
    energyConsumption: 2, // Lower is better
    waterConsumption: 2, // Lower is better
    spillsIncidents: 2, // Binary: 0 = full points
    environmentalIncidents: 2, // Binary: 0 = full points

    // Health & Hygiene (4 points total) - NEW
    healthCheckupCompliance: 2,
    waterQualityTest: 2,
  };

  /**
   * Calculate individual parameter score based on target, actual values, and weight
   * Uses Excel-style binary scoring for incidents
   */
  private calculateParameterScore(
    target: number,
    actual: number,
    weight: number,
    isIncident: boolean = false,
    lowerIsBetter: boolean = false
  ): number {
    // Special case: If target and actual are both equal, always give full points
    if (target === actual) {
      return weight;
    }

    // For incident metrics (target should be 0, lower actual is better)
    // Binary scoring: 0 incidents = full weight, any incident = 0 points
    if (isIncident) {
      return actual === 0 ? weight : 0;
    }

    // For negative metrics (lower actual is better - waste, energy, water, overdue trainings)
    // Inverted ratio: if actual <= target, full points; if actual > target, reduced points
    if (lowerIsBetter) {
      if (target === 0) return 0; // Avoid division by zero
      if (actual <= target) return weight; // Met or beat target

      // Exceeded target (worse), calculate penalty
      const ratio = target / actual;
      const score = ratio * weight;
      return Math.max(score, 0); // Floor at 0
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
   * NOW INCLUDES ALL 32 PARAMETERS (18 original + 14 new)
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
    totalScore += Number(metric.recordableIncidentsScore || 0) * (this.PARAMETER_WEIGHTS.recordableIncidents / 10); // NEW

    // Compliance Issues (4 points max)
    totalScore += Number(metric.nonComplianceRaisedScore || 0) * (this.PARAMETER_WEIGHTS.nonComplianceRaised / 10);

    // Core Performance (24 points max)
    totalScore += Number(metric.manDaysScore || 0) * (this.PARAMETER_WEIGHTS.manDays / 10);
    totalScore += Number(metric.safeWorkHoursScore || 0) * (this.PARAMETER_WEIGHTS.safeWorkHours / 10);
    totalScore += Number(metric.safetyInductionScore || 0) * (this.PARAMETER_WEIGHTS.safetyInduction / 10);
    totalScore += Number(metric.toolBoxTalkScore || 0) * (this.PARAMETER_WEIGHTS.toolBoxTalk / 10);
    totalScore += Number(metric.jobSpecificTrainingScore || 0) * (this.PARAMETER_WEIGHTS.jobSpecificTraining / 10);
    totalScore += Number(metric.formalSafetyInspectionScore || 0) * (this.PARAMETER_WEIGHTS.formalSafetyInspection / 10);
    totalScore += Number(metric.emergencyMockDrillsScore || 0) * (this.PARAMETER_WEIGHTS.emergencyMockDrills / 10);
    totalScore += Number(metric.internalAuditScore || 0) * (this.PARAMETER_WEIGHTS.internalAudit / 10);
    totalScore += Number(metric.safetyObservationRaisedScore || 0) * (this.PARAMETER_WEIGHTS.safetyObservationRaised / 10);
    totalScore += Number(metric.workforceTrainedScore || 0) * (this.PARAMETER_WEIGHTS.workforceTrainedPercent / 10); // NEW
    totalScore += Number(metric.ppeObservationsScore || 0) * (this.PARAMETER_WEIGHTS.ppeObservations / 10); // NEW
    totalScore += Number(metric.upcomingTrainingsScore || 0) * (this.PARAMETER_WEIGHTS.upcomingTrainings / 10); // NEW

    // Documentation (4 points max)
    totalScore += Number(metric.nonComplianceCloseScore || 0) * (this.PARAMETER_WEIGHTS.nonComplianceClose / 10);
    totalScore += Number(metric.safetyObservationCloseScore || 0) * (this.PARAMETER_WEIGHTS.safetyObservationClose / 10);
    totalScore += Number(metric.workPermitIssuedScore || 0) * (this.PARAMETER_WEIGHTS.workPermitIssued / 10);
    totalScore += Number(metric.safeWorkMethodStatementScore || 0) * (this.PARAMETER_WEIGHTS.safeWorkMethodStatement / 10);

    // PPE Compliance (2 points max) - NEW
    totalScore += Number(metric.ppeComplianceRateScore || 0) * (this.PARAMETER_WEIGHTS.ppeComplianceRate / 10);

    // Training Management (2 points max) - NEW
    totalScore += Number(metric.overdueTrainingsScore || 0) * (this.PARAMETER_WEIGHTS.overdueTrainings / 10);

    // Environment Metrics (12 points max) - NEW
    totalScore += Number(metric.wasteGeneratedScore || 0) * (this.PARAMETER_WEIGHTS.wasteGenerated / 10);
    totalScore += Number(metric.wasteDisposedScore || 0) * (this.PARAMETER_WEIGHTS.wasteDisposed / 10);
    totalScore += Number(metric.energyConsumptionScore || 0) * (this.PARAMETER_WEIGHTS.energyConsumption / 10);
    totalScore += Number(metric.waterConsumptionScore || 0) * (this.PARAMETER_WEIGHTS.waterConsumption / 10);
    totalScore += Number(metric.spillsIncidentsScore || 0) * (this.PARAMETER_WEIGHTS.spillsIncidents / 10);
    totalScore += Number(metric.environmentalIncidentsScore || 0) * (this.PARAMETER_WEIGHTS.environmentalIncidents / 10);

    // Health & Hygiene (4 points max) - NEW
    totalScore += Number(metric.healthCheckupComplianceScore || 0) * (this.PARAMETER_WEIGHTS.healthCheckupCompliance / 10);
    totalScore += Number(metric.waterQualityTestScore || 0) * (this.PARAMETER_WEIGHTS.waterQualityTest / 10);

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
   * Calculate derived KPIs based on reference formulas
   */
  private calculateKPIs(metric: any): any {
    const totalHoursWorked = Number(metric.safeWorkHoursActual) || 0;
    const totalEmployees = Number(metric.manDaysActual) || 0; // Using manDays as proxy for employee count

    // TRIR = (Number of Recordable Incidents × 200,000) / Total Hours Worked
    const trir = totalHoursWorked > 0
      ? ((Number(metric.recordableIncidentsActual) || 0) * 200000) / totalHoursWorked
      : 0;

    // LTIFR = (Number of Lost Time Injuries × 1,000,000) / Total Hours Worked
    const ltifr = totalHoursWorked > 0
      ? ((Number(metric.lostTimeInjuryActual) || 0) * 1000000) / totalHoursWorked
      : 0;

    // Near Miss Rate = (Number of Near Misses × 100) / Total Number of Employees
    const nearMissRate = totalEmployees > 0
      ? ((Number(metric.nearMissReportActual) || 0) * 100) / totalEmployees
      : 0;

    // Safety Inspection Completion % = (Actual / Target) × 100
    const safetyInspectionCompletion = Number(metric.formalSafetyInspectionTarget) > 0
      ? ((Number(metric.formalSafetyInspectionActual) || 0) / Number(metric.formalSafetyInspectionTarget)) * 100
      : 0;

    // PPE Compliance Rate = (Compliant Observations / Total Observations) × 100
    // Using ppeComplianceRateActual as it's already stored as a percentage
    const ppeComplianceRate = Number(metric.ppeComplianceRateActual) || 0;

    return {
      trir: parseFloat(trir.toFixed(2)),
      ltifr: parseFloat(ltifr.toFixed(2)),
      nearMissRate: parseFloat(nearMissRate.toFixed(2)),
      safetyInspectionCompletion: parseFloat(safetyInspectionCompletion.toFixed(2)),
      ppeComplianceRate: parseFloat(ppeComplianceRate.toFixed(2)),
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
   * NOW INCLUDES ALL 32 PARAMETERS (18 original + 14 new)
   */
  private calculateAllParameterScores(data: any): any {
    const processedData: any = {};

    // Define parameter mappings (field name -> weight -> isIncident flag -> lowerIsBetter flag)
    const parameters = [
      // Core Performance (2 pts each)
      { target: 'manDaysTarget', actual: 'manDaysActual', score: 'manDaysScore', weight: this.PARAMETER_WEIGHTS.manDays, isIncident: false, lowerIsBetter: false },
      { target: 'safeWorkHoursTarget', actual: 'safeWorkHoursActual', score: 'safeWorkHoursScore', weight: this.PARAMETER_WEIGHTS.safeWorkHours, isIncident: false, lowerIsBetter: false },
      { target: 'safetyInductionTarget', actual: 'safetyInductionActual', score: 'safetyInductionScore', weight: this.PARAMETER_WEIGHTS.safetyInduction, isIncident: false, lowerIsBetter: false },
      { target: 'toolBoxTalkTarget', actual: 'toolBoxTalkActual', score: 'toolBoxTalkScore', weight: this.PARAMETER_WEIGHTS.toolBoxTalk, isIncident: false, lowerIsBetter: false },
      { target: 'jobSpecificTrainingTarget', actual: 'jobSpecificTrainingActual', score: 'jobSpecificTrainingScore', weight: this.PARAMETER_WEIGHTS.jobSpecificTraining, isIncident: false, lowerIsBetter: false },
      { target: 'formalSafetyInspectionTarget', actual: 'formalSafetyInspectionActual', score: 'formalSafetyInspectionScore', weight: this.PARAMETER_WEIGHTS.formalSafetyInspection, isIncident: false, lowerIsBetter: false },
      { target: 'emergencyMockDrillsTarget', actual: 'emergencyMockDrillsActual', score: 'emergencyMockDrillsScore', weight: this.PARAMETER_WEIGHTS.emergencyMockDrills, isIncident: false, lowerIsBetter: false },
      { target: 'internalAuditTarget', actual: 'internalAuditActual', score: 'internalAuditScore', weight: this.PARAMETER_WEIGHTS.internalAudit, isIncident: false, lowerIsBetter: false },
      { target: 'safetyObservationRaisedTarget', actual: 'safetyObservationRaisedActual', score: 'safetyObservationRaisedScore', weight: this.PARAMETER_WEIGHTS.safetyObservationRaised, isIncident: false, lowerIsBetter: false },
      { target: 'workforceTrainedTarget', actual: 'workforceTrainedActual', score: 'workforceTrainedScore', weight: this.PARAMETER_WEIGHTS.workforceTrainedPercent, isIncident: false, lowerIsBetter: false }, // NEW
      { target: 'ppeObservationsTarget', actual: 'ppeObservationsActual', score: 'ppeObservationsScore', weight: this.PARAMETER_WEIGHTS.ppeObservations, isIncident: false, lowerIsBetter: false }, // NEW
      { target: 'upcomingTrainingsTarget', actual: 'upcomingTrainingsActual', score: 'upcomingTrainingsScore', weight: this.PARAMETER_WEIGHTS.upcomingTrainings, isIncident: false, lowerIsBetter: false }, // NEW

      // Documentation (1 pt each)
      { target: 'nonComplianceCloseTarget', actual: 'nonComplianceCloseActual', score: 'nonComplianceCloseScore', weight: this.PARAMETER_WEIGHTS.nonComplianceClose, isIncident: false, lowerIsBetter: false },
      { target: 'safetyObservationCloseTarget', actual: 'safetyObservationCloseActual', score: 'safetyObservationCloseScore', weight: this.PARAMETER_WEIGHTS.safetyObservationClose, isIncident: false, lowerIsBetter: false },
      { target: 'workPermitIssuedTarget', actual: 'workPermitIssuedActual', score: 'workPermitIssuedScore', weight: this.PARAMETER_WEIGHTS.workPermitIssued, isIncident: false, lowerIsBetter: false },
      { target: 'safeWorkMethodStatementTarget', actual: 'safeWorkMethodStatementActual', score: 'safeWorkMethodStatementScore', weight: this.PARAMETER_WEIGHTS.safeWorkMethodStatement, isIncident: false, lowerIsBetter: false },

      // PPE Compliance (2 pts) - NEW
      { target: 'ppeComplianceRateTarget', actual: 'ppeComplianceRateActual', score: 'ppeComplianceRateScore', weight: this.PARAMETER_WEIGHTS.ppeComplianceRate, isIncident: false, lowerIsBetter: false },

      // Compliance Issues (4 pts) - Binary
      { target: 'nonComplianceRaisedTarget', actual: 'nonComplianceRaisedActual', score: 'nonComplianceRaisedScore', weight: this.PARAMETER_WEIGHTS.nonComplianceRaised, isIncident: true, lowerIsBetter: false },

      // Training Management (2 pts) - Binary - NEW
      { target: 'overdueTrainingsTarget', actual: 'overdueTrainingsActual', score: 'overdueTrainingsScore', weight: this.PARAMETER_WEIGHTS.overdueTrainings, isIncident: true, lowerIsBetter: false },

      // Critical Incidents (8 pts each) - Binary
      { target: 'nearMissReportTarget', actual: 'nearMissReportActual', score: 'nearMissReportScore', weight: this.PARAMETER_WEIGHTS.nearMissReport, isIncident: true, lowerIsBetter: false },
      { target: 'firstAidInjuryTarget', actual: 'firstAidInjuryActual', score: 'firstAidInjuryScore', weight: this.PARAMETER_WEIGHTS.firstAidInjury, isIncident: true, lowerIsBetter: false },
      { target: 'medicalTreatmentInjuryTarget', actual: 'medicalTreatmentInjuryActual', score: 'medicalTreatmentInjuryScore', weight: this.PARAMETER_WEIGHTS.medicalTreatmentInjury, isIncident: true, lowerIsBetter: false },
      { target: 'lostTimeInjuryTarget', actual: 'lostTimeInjuryActual', score: 'lostTimeInjuryScore', weight: this.PARAMETER_WEIGHTS.lostTimeInjury, isIncident: true, lowerIsBetter: false },
      { target: 'recordableIncidentsTarget', actual: 'recordableIncidentsActual', score: 'recordableIncidentsScore', weight: this.PARAMETER_WEIGHTS.recordableIncidents, isIncident: true, lowerIsBetter: false }, // NEW

      // Environment Metrics (2 pts each) - NEW
      { target: 'wasteGeneratedTarget', actual: 'wasteGeneratedActual', score: 'wasteGeneratedScore', weight: this.PARAMETER_WEIGHTS.wasteGenerated, isIncident: false, lowerIsBetter: true }, // Lower is better
      { target: 'wasteDisposedTarget', actual: 'wasteDisposedActual', score: 'wasteDisposedScore', weight: this.PARAMETER_WEIGHTS.wasteDisposed, isIncident: false, lowerIsBetter: false }, // Higher is better
      { target: 'energyConsumptionTarget', actual: 'energyConsumptionActual', score: 'energyConsumptionScore', weight: this.PARAMETER_WEIGHTS.energyConsumption, isIncident: false, lowerIsBetter: true }, // Lower is better
      { target: 'waterConsumptionTarget', actual: 'waterConsumptionActual', score: 'waterConsumptionScore', weight: this.PARAMETER_WEIGHTS.waterConsumption, isIncident: false, lowerIsBetter: true }, // Lower is better
      { target: 'spillsIncidentsTarget', actual: 'spillsIncidentsActual', score: 'spillsIncidentsScore', weight: this.PARAMETER_WEIGHTS.spillsIncidents, isIncident: true, lowerIsBetter: false }, // Binary
      { target: 'environmentalIncidentsTarget', actual: 'environmentalIncidentsActual', score: 'environmentalIncidentsScore', weight: this.PARAMETER_WEIGHTS.environmentalIncidents, isIncident: true, lowerIsBetter: false }, // Binary

      // Health & Hygiene (2 pts each) - NEW
      { target: 'healthCheckupComplianceTarget', actual: 'healthCheckupComplianceActual', score: 'healthCheckupComplianceScore', weight: this.PARAMETER_WEIGHTS.healthCheckupCompliance, isIncident: false, lowerIsBetter: false },
      { target: 'waterQualityTestTarget', actual: 'waterQualityTestActual', score: 'waterQualityTestScore', weight: this.PARAMETER_WEIGHTS.waterQualityTest, isIncident: false, lowerIsBetter: false },
    ];

    // Process each parameter
    parameters.forEach(({ target, actual, score, weight, isIncident, lowerIsBetter }) => {
      if (data[target] !== undefined && data[actual] !== undefined) {
        const targetVal = Number(data[target]) || 0;
        const actualVal = Number(data[actual]) || 0;

        processedData[target] = targetVal;
        processedData[actual] = actualVal;

        // Calculate weighted score but store as 0-10 for DB compatibility
        const weightedScore = this.calculateParameterScore(targetVal, actualVal, weight, isIncident, lowerIsBetter);
        // Convert back to 0-10 scale for storage (will be converted back when calculating total)
        processedData[score] = (weightedScore / weight) * 10;
      }
    });

    return processedData;
  }
}

export const safetyMetricsService = new SafetyMetricsService();

