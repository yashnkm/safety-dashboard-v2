import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { auditLogService } from './auditLog.service';

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
            companyId: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    // A SUPER_ADMIN's results can span multiple companies, each with its own
    // configured weights — fetch each distinct company's weights once rather
    // than per-record.
    const distinctCompanyIds = [...new Set(metrics.map((m) => m.site.companyId))];
    const weightsByCompany = new Map(
      await Promise.all(
        distinctCompanyIds.map(async (id) => [id, await this.getCompanyWeights(id)] as const)
      )
    );

    // Calculate totalScore, percentage, rating, and KPIs dynamically for each metric
    return metrics.map((metric) => {
      const weights = weightsByCompany.get(metric.site.companyId) ?? this.getDefaultWeights();
      const calculatedScores = this.calculateMetricScores(metric, weights);
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
    data: any,
    role?: string,
    userId?: string,
    auditContext?: { ipAddress?: string | null; userAgent?: string | null }
  ) {
    // Verify site exists
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { companyId: true },
    });

    if (!site) {
      throw new AppError(404, 'Site not found');
    }

    // SUPER_ADMIN can save metrics for any site; everyone else is confined
    // to their own company's sites (matches bulkImportMetrics below).
    if (role !== 'SUPER_ADMIN' && site.companyId !== companyId) {
      throw new AppError(403, 'Access denied to this site');
    }

    const validationErrors = this.validateParameterValues(data);
    if (validationErrors.length > 0) {
      throw new AppError(400, `Invalid data: ${validationErrors.join('; ')}`);
    }

    // Use the site's own company's weights (not the caller's — a SUPER_ADMIN
    // saving into another company's site must still score against that
    // site's configured weights, not their own).
    const weights = await this.getCompanyWeights(site.companyId);

    // Derive every parameter's score from its target/actual values — never
    // trust *Score fields supplied directly in the request body, the same
    // way bulkImportMetrics() already does for Excel imports.
    const processedData = this.calculateAllParameterScores(data, weights);

    // Calculate total score
    const totalScore = this.calculateTotalScore(processedData, weights);
    const percentage = (totalScore / 100) * 100;
    const rating = this.getRating(percentage);

    // Captured before the write so the audit log can show what actually
    // changed, not just what it's now set to.
    const existing = await prisma.safetyMetrics.findUnique({
      where: { siteId_month_year: { siteId, month, year } },
    });
    const oldValues = existing
      ? this.TARGET_ACTUAL_FIELDS.reduce((acc, [target, actual]) => {
          acc[target] = (existing as any)[target];
          acc[actual] = (existing as any)[actual];
          return acc;
        }, {} as Record<string, any>)
      : null;

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
      include: {
        site: {
          select: {
            siteName: true,
            siteCode: true,
          },
        },
      },
    });

    await auditLogService.logChange({
      companyId: site.companyId,
      siteId,
      userId: userId ?? null,
      action: existing ? 'update' : 'create',
      entityType: 'SafetyMetrics',
      entityId: metric.id,
      oldValues,
      newValues: data,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    });

    return metric;
  }

  /**
   * Parameter weights - defines max points for each parameter (total = 100 points exactly)
   *
   * Weight Distribution (32 parameters):
   * - Critical Incidents: 40 points (8 pts each × 5 params)
   * - Compliance: 4 points (1 param)
   * - Core Performance: 22 points (2 pts each × 11 params)
   * - Documentation: 4 points (1 pt each × 4 params)
   * - PPE: 6 points (ppeComplianceRate 4 + ppeObservations 2)
   * - Training Mgmt: 6 points (overdueTrainings 4 + upcomingTrainings 2)
   * - Environment: 12 points (2 pts each × 6 params)
   * - Health: 6 points (healthCheckupCompliance 4 + waterQualityTest 2)
   * Total = 100 points
   *
   * NOTE: this previously summed to 92, not 100 — ppeComplianceRate,
   * overdueTrainings, workforceTrainedPercent, and healthCheckupCompliance
   * were each bumped +2 to close the gap, since they were under-weighted
   * relative to their category's intended share.
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
    workforceTrainedPercent: 4, // NEW (was 2)
    ppeObservations: 2, // NEW
    upcomingTrainings: 2, // NEW

    // Documentation (4 points total) - Ratio scoring
    nonComplianceClose: 1,
    safetyObservationClose: 1,
    workPermitIssued: 1,
    safeWorkMethodStatement: 1,

    // PPE Compliance (4 points) - NEW (was 2)
    ppeComplianceRate: 4,

    // Training Management (4 points) - NEW (was 2)
    overdueTrainings: 4, // Binary: 0 = full points, any > 0 = 0 points

    // Environment Metrics (12 points total) - NEW
    wasteGenerated: 2, // Lower is better
    wasteDisposed: 2,
    energyConsumption: 2, // Lower is better
    waterConsumption: 2, // Lower is better
    spillsIncidents: 2, // Binary: 0 = full points
    environmentalIncidents: 2, // Binary: 0 = full points

    // Health & Hygiene (4 points total) - NEW (healthCheckupCompliance was 2)
    healthCheckupCompliance: 4,
    waterQualityTest: 2,
  };

  /**
   * Maps each parameter key (as used in PARAMETER_WEIGHTS) to its
   * CompanySettings column name — the single source of truth for both
   * reading a company's custom weights and validating/writing an update.
   */
  private readonly WEIGHT_FIELD_MAP: [keyof typeof this.PARAMETER_WEIGHTS, string][] = [
    ['nearMissReport', 'weightNearMissReport'],
    ['firstAidInjury', 'weightFirstAidInjury'],
    ['medicalTreatmentInjury', 'weightMedicalTreatmentInjury'],
    ['lostTimeInjury', 'weightLostTimeInjury'],
    ['recordableIncidents', 'weightRecordableIncidents'],
    ['nonComplianceRaised', 'weightNonComplianceRaised'],
    ['manDays', 'weightManDays'],
    ['safeWorkHours', 'weightSafeWorkHours'],
    ['safetyInduction', 'weightSafetyInduction'],
    ['toolBoxTalk', 'weightToolBoxTalk'],
    ['jobSpecificTraining', 'weightJobSpecificTraining'],
    ['formalSafetyInspection', 'weightFormalSafetyInspection'],
    ['emergencyMockDrills', 'weightEmergencyMockDrills'],
    ['internalAudit', 'weightInternalAudit'],
    ['safetyObservationRaised', 'weightSafetyObservationRaised'],
    ['workforceTrainedPercent', 'weightWorkforceTrainedPercent'],
    ['ppeObservations', 'weightPpeObservations'],
    ['upcomingTrainings', 'weightUpcomingTrainings'],
    ['nonComplianceClose', 'weightNonComplianceClose'],
    ['safetyObservationClose', 'weightSafetyObservationClose'],
    ['workPermitIssued', 'weightWorkPermitIssued'],
    ['safeWorkMethodStatement', 'weightSafeWorkMethodStatement'],
    ['ppeComplianceRate', 'weightPpeComplianceRate'],
    ['overdueTrainings', 'weightOverdueTrainings'],
    ['wasteGenerated', 'weightWasteGenerated'],
    ['wasteDisposed', 'weightWasteDisposed'],
    ['energyConsumption', 'weightEnergyConsumption'],
    ['waterConsumption', 'weightWaterConsumption'],
    ['spillsIncidents', 'weightSpillsIncidents'],
    ['environmentalIncidents', 'weightEnvironmentalIncidents'],
    ['healthCheckupCompliance', 'weightHealthCheckupCompliance'],
    ['waterQualityTest', 'weightWaterQualityTest'],
  ];

  /**
   * The hardcoded weights, exposed for the admin settings UI to show as
   * defaults for a company that hasn't configured custom weights yet.
   */
  getDefaultWeights(): Record<string, number> {
    return { ...this.PARAMETER_WEIGHTS };
  }

  /**
   * Exposes the parameter-key <-> CompanySettings-column mapping so the
   * admin settings API can read/validate/write weights without duplicating
   * this list.
   */
  getWeightFieldMap(): [string, string][] {
    return [...this.WEIGHT_FIELD_MAP];
  }

  /**
   * A company's effective per-parameter weights: its custom CompanySettings
   * row if one exists, otherwise the hardcoded defaults. Custom weights that
   * don't sum to exactly 100 (e.g. an admin data-entry mistake) are scaled
   * proportionally so the 100-point total the rest of the scoring engine
   * assumes still holds.
   */
  async getCompanyWeights(companyId: string): Promise<Record<string, number>> {
    const settings = await prisma.companySettings.findUnique({ where: { companyId } });
    if (!settings) {
      return this.getDefaultWeights();
    }

    const raw: Record<string, number> = {};
    for (const [paramKey, dbField] of this.WEIGHT_FIELD_MAP) {
      raw[paramKey] = Number((settings as any)[dbField]);
    }

    const sum = Object.values(raw).reduce((a, b) => a + b, 0);
    if (!Number.isFinite(sum) || sum <= 0) {
      return this.getDefaultWeights();
    }
    if (Math.abs(sum - 100) < 0.01) {
      return raw;
    }

    const normalized: Record<string, number> = {};
    for (const key of Object.keys(raw)) {
      normalized[key] = (raw[key] / sum) * 100;
    }
    return normalized;
  }

  /**
   * Calculate individual parameter score based on target, actual values, and weight
   * Uses Excel-style binary scoring for incidents
   */
  private calculateParameterScore(
    target: number,
    actual: number,
    weight: number,
    isIncident: boolean = false,
    lowerIsBetter: boolean = false,
    blankTargetAwardsFullCredit: boolean = false,
    leadingIndicator: boolean = false,
    rateMultiplier?: number,
    hoursWorked?: number
  ): number {
    // For incident metrics, target is always 0 by design — "zero incidents"
    // is the goal, not missing data. This must run BEFORE the no-data guard
    // below: otherwise a genuinely perfect zero-incident month (target=0,
    // actual=0) is indistinguishable from "no data entered" and incorrectly
    // scores 0 instead of full weight. Record-level emptiness (every one of
    // the 32 parameters at 0) is caught separately by hasNoData().
    if (isIncident) {
      // Leading indicators (currently: Near Miss Report) never get punished
      // for a non-zero count — more reporting reflects a stronger safety
      // culture, so it always scores full weight, the same as zero reports.
      if (leadingIndicator) {
        return weight;
      }
      if (actual === 0) {
        return weight;
      }
      // Rate-based severity (LTIFR/TRIR-style, per industry-standard
      // per-hours-worked formulas): a raw count unfairly equates a small
      // site to a huge one — 2 injuries at 50,000 hours worked is far more
      // severe than 2 injuries at 500,000 hours. Normalizing by hours
      // reflects real frequency relative to site activity. Falls back to
      // the plain per-count decay when hours-worked data isn't available.
      if (rateMultiplier && hoursWorked && hoursWorked > 0) {
        const rate = (actual * rateMultiplier) / hoursWorked;
        return weight / (1 + rate);
      }
      // Non-zero counts decay smoothly (weight / (1 + actual)) instead of
      // dropping straight to 0, so severity is distinguishable: 1 incident
      // still scores meaningfully higher than 45 of the same type.
      return weight / (1 + actual);
    }

    // IMPORTANT: If both target and actual are 0, this means NO DATA - return 0 score
    // This prevents empty months from showing 100%
    if (target === 0 && actual === 0) {
      return 0;
    }

    // Special case: If target equals actual (and both > 0), give full points
    if (target === actual && target > 0) {
      return weight;
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
    if (target === 0) {
      // No target was ever set for this field, so there's nothing to compute
      // a ratio against. This full-credit-for-real-activity treatment is
      // deliberately opt-in (blankTargetAwardsFullCredit) rather than applied
      // to every ratio parameter: it's only justified for leading indicators
      // like Safety Observation Raised / PPE Observations, where "more" is
      // defensibly good. For most other parameters (e.g. Upcoming Trainings)
      // there's no such argument, so they keep the old, safer default of 0
      // until a real target is configured.
      return blankTargetAwardsFullCredit && actual > 0 ? weight : 0;
    }

    const ratio = actual / target;
    const score = ratio * weight;
    return Math.min(score, weight); // Cap at max weight
  }

  /**
   * Target/actual field pairs for all 32 parameters — used only to detect
   * whether a record has any real data at all (see hasNoData below).
   */
  private readonly TARGET_ACTUAL_FIELDS: [string, string][] = [
    ['manDaysTarget', 'manDaysActual'],
    ['safeWorkHoursTarget', 'safeWorkHoursActual'],
    ['safetyInductionTarget', 'safetyInductionActual'],
    ['toolBoxTalkTarget', 'toolBoxTalkActual'],
    ['jobSpecificTrainingTarget', 'jobSpecificTrainingActual'],
    ['formalSafetyInspectionTarget', 'formalSafetyInspectionActual'],
    ['nonComplianceRaisedTarget', 'nonComplianceRaisedActual'],
    ['nonComplianceCloseTarget', 'nonComplianceCloseActual'],
    ['safetyObservationRaisedTarget', 'safetyObservationRaisedActual'],
    ['safetyObservationCloseTarget', 'safetyObservationCloseActual'],
    ['workPermitIssuedTarget', 'workPermitIssuedActual'],
    ['safeWorkMethodStatementTarget', 'safeWorkMethodStatementActual'],
    ['emergencyMockDrillsTarget', 'emergencyMockDrillsActual'],
    ['internalAuditTarget', 'internalAuditActual'],
    ['nearMissReportTarget', 'nearMissReportActual'],
    ['firstAidInjuryTarget', 'firstAidInjuryActual'],
    ['medicalTreatmentInjuryTarget', 'medicalTreatmentInjuryActual'],
    ['lostTimeInjuryTarget', 'lostTimeInjuryActual'],
    ['recordableIncidentsTarget', 'recordableIncidentsActual'],
    ['ppeComplianceRateTarget', 'ppeComplianceRateActual'],
    ['ppeObservationsTarget', 'ppeObservationsActual'],
    ['workforceTrainedTarget', 'workforceTrainedActual'],
    ['upcomingTrainingsTarget', 'upcomingTrainingsActual'],
    ['overdueTrainingsTarget', 'overdueTrainingsActual'],
    ['wasteGeneratedTarget', 'wasteGeneratedActual'],
    ['wasteDisposedTarget', 'wasteDisposedActual'],
    ['energyConsumptionTarget', 'energyConsumptionActual'],
    ['waterConsumptionTarget', 'waterConsumptionActual'],
    ['spillsIncidentsTarget', 'spillsIncidentsActual'],
    ['environmentalIncidentsTarget', 'environmentalIncidentsActual'],
    ['healthCheckupComplianceTarget', 'healthCheckupComplianceActual'],
    ['waterQualityTestTarget', 'waterQualityTestActual'],
  ];

  /**
   * Target/actual pairs that represent a percentage (0-100), not a raw count.
   */
  private readonly PERCENTAGE_FIELDS: [string, string][] = [
    ['ppeComplianceRateTarget', 'ppeComplianceRateActual'],
    ['workforceTrainedTarget', 'workforceTrainedActual'],
    ['healthCheckupComplianceTarget', 'healthCheckupComplianceActual'],
  ];

  /**
   * Catches impossible values before they're saved — negative counts,
   * non-numeric input, or a percentage field outside 0-100. Returns a list
   * of human-readable problems; an empty list means the row is clean.
   * Deliberately does NOT flag "actual far exceeds target" as an error —
   * a genuinely bad month (e.g. way more non-compliances than planned) is
   * real data, not an impossible value, so it's left for the scoring engine
   * to reflect rather than rejected here.
   */
  private validateParameterValues(data: any): string[] {
    const errors: string[] = [];
    const percentageFieldNames = new Set(this.PERCENTAGE_FIELDS.flat());

    for (const [targetField, actualField] of this.TARGET_ACTUAL_FIELDS) {
      for (const field of [targetField, actualField]) {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
          continue; // absent fields are handled elsewhere (treated as 0 / no data)
        }

        const value = Number(data[field]);

        if (!Number.isFinite(value)) {
          errors.push(`${field}: "${data[field]}" is not a valid number`);
          continue;
        }

        if (value < 0) {
          errors.push(`${field}: ${value} cannot be negative`);
          continue;
        }

        if (percentageFieldNames.has(field) && value > 100) {
          errors.push(`${field}: ${value} exceeds 100% — this parameter is a percentage`);
        }
      }
    }

    return errors;
  }

  /**
   * True only if every target and actual value across all 32 parameters is 0 —
   * i.e. no real data was ever entered for this record, regardless of what its
   * stored *Score columns contain (those can be wrong if a row was written by
   * something other than the normal import/scoring path).
   */
  private hasNoData(metric: any): boolean {
    return this.TARGET_ACTUAL_FIELDS.every(
      ([target, actual]) => Number(metric[target] || 0) === 0 && Number(metric[actual] || 0) === 0
    );
  }

  /**
   * Calculate totalScore, percentage, and rating from individual parameter scores
   * Uses weighted sum (not average) matching Excel logic
   * NOW INCLUDES ALL 32 PARAMETERS (18 original + 14 new)
   */
  private calculateMetricScores(
    metric: any,
    weights: Record<string, number> = this.PARAMETER_WEIGHTS
  ): { totalScore: number; percentage: number; rating: 'LOW' | 'MEDIUM' | 'HIGH' } {
    // A record with zero target AND zero actual across every one of the 32
    // parameters has no real data entered for that month. Never award a score
    // based on whatever happens to be sitting in the stored *Score columns in
    // that case — those can be wrong if the row was written by something
    // other than the normal import/scoring path (e.g. a direct DB insert).
    if (this.hasNoData(metric)) {
      return { totalScore: 0, percentage: 0, rating: 'LOW' };
    }

    // Calculate weighted sum of all parameter scores
    // Note: Scores in DB are stored as 0-10 for backward compatibility,
    // but we need to convert them to weighted values

    let totalScore = 0;

    // Critical Incidents (40 points max) - stored as 0-10, multiply by weight/10
    totalScore += Number(metric.nearMissReportScore || 0) * (weights.nearMissReport / 10);
    totalScore += Number(metric.firstAidInjuryScore || 0) * (weights.firstAidInjury / 10);
    totalScore += Number(metric.medicalTreatmentInjuryScore || 0) * (weights.medicalTreatmentInjury / 10);
    totalScore += Number(metric.lostTimeInjuryScore || 0) * (weights.lostTimeInjury / 10);
    totalScore += Number(metric.recordableIncidentsScore || 0) * (weights.recordableIncidents / 10); // NEW

    // Compliance Issues (4 points max)
    totalScore += Number(metric.nonComplianceRaisedScore || 0) * (weights.nonComplianceRaised / 10);

    // Core Performance (24 points max)
    totalScore += Number(metric.manDaysScore || 0) * (weights.manDays / 10);
    totalScore += Number(metric.safeWorkHoursScore || 0) * (weights.safeWorkHours / 10);
    totalScore += Number(metric.safetyInductionScore || 0) * (weights.safetyInduction / 10);
    totalScore += Number(metric.toolBoxTalkScore || 0) * (weights.toolBoxTalk / 10);
    totalScore += Number(metric.jobSpecificTrainingScore || 0) * (weights.jobSpecificTraining / 10);
    totalScore += Number(metric.formalSafetyInspectionScore || 0) * (weights.formalSafetyInspection / 10);
    totalScore += Number(metric.emergencyMockDrillsScore || 0) * (weights.emergencyMockDrills / 10);
    totalScore += Number(metric.internalAuditScore || 0) * (weights.internalAudit / 10);
    totalScore += Number(metric.safetyObservationRaisedScore || 0) * (weights.safetyObservationRaised / 10);
    totalScore += Number(metric.workforceTrainedScore || 0) * (weights.workforceTrainedPercent / 10); // NEW
    totalScore += Number(metric.ppeObservationsScore || 0) * (weights.ppeObservations / 10); // NEW
    totalScore += Number(metric.upcomingTrainingsScore || 0) * (weights.upcomingTrainings / 10); // NEW

    // Documentation (4 points max)
    totalScore += Number(metric.nonComplianceCloseScore || 0) * (weights.nonComplianceClose / 10);
    totalScore += Number(metric.safetyObservationCloseScore || 0) * (weights.safetyObservationClose / 10);
    totalScore += Number(metric.workPermitIssuedScore || 0) * (weights.workPermitIssued / 10);
    totalScore += Number(metric.safeWorkMethodStatementScore || 0) * (weights.safeWorkMethodStatement / 10);

    // PPE Compliance (2 points max) - NEW
    totalScore += Number(metric.ppeComplianceRateScore || 0) * (weights.ppeComplianceRate / 10);

    // Training Management (2 points max) - NEW
    totalScore += Number(metric.overdueTrainingsScore || 0) * (weights.overdueTrainings / 10);

    // Environment Metrics (12 points max) - NEW
    totalScore += Number(metric.wasteGeneratedScore || 0) * (weights.wasteGenerated / 10);
    totalScore += Number(metric.wasteDisposedScore || 0) * (weights.wasteDisposed / 10);
    totalScore += Number(metric.energyConsumptionScore || 0) * (weights.energyConsumption / 10);
    totalScore += Number(metric.waterConsumptionScore || 0) * (weights.waterConsumption / 10);
    totalScore += Number(metric.spillsIncidentsScore || 0) * (weights.spillsIncidents / 10);
    totalScore += Number(metric.environmentalIncidentsScore || 0) * (weights.environmentalIncidents / 10);

    // Health & Hygiene (4 points max) - NEW
    totalScore += Number(metric.healthCheckupComplianceScore || 0) * (weights.healthCheckupCompliance / 10);
    totalScore += Number(metric.waterQualityTestScore || 0) * (weights.waterQualityTest / 10);

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
  private calculateTotalScore(data: any, weights: Record<string, number> = this.PARAMETER_WEIGHTS): number {
    // Use the new calculation method
    const metric = { ...data };
    const calculated = this.calculateMetricScores(metric, weights);
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
              logoUrl: true,
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
    metricsData: any[],
    auditContext?: { ipAddress?: string | null; userAgent?: string | null }
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

    // Fetched once for the whole batch — every row in an import belongs to
    // the same site, so the same company's weights apply throughout.
    const weights = await this.getCompanyWeights(site.companyId);

    // Process each month's data
    for (const monthData of metricsData) {
      try {
        const { month, ...data } = monthData;

        if (!month) {
          results.failed++;
          results.errors.push({ month: 'unknown', error: 'Month is required' });
          continue;
        }

        const validationErrors = this.validateParameterValues(data);
        if (validationErrors.length > 0) {
          results.failed++;
          results.errors.push({ month, error: validationErrors.join('; ') });
          continue;
        }

        // Calculate individual parameter scores
        const processedData = this.calculateAllParameterScores(data, weights);

        // Calculate total score
        const totalScore = this.calculateTotalScore(processedData, weights);
        const percentage = (totalScore / 100) * 100;
        const rating = this.getRating(percentage);

        // Captured before the write so the audit log can show what actually
        // changed, not just what it's now set to.
        const existing = await prisma.safetyMetrics.findUnique({
          where: { siteId_month_year: { siteId, month, year } },
        });
        const oldValues = existing
          ? this.TARGET_ACTUAL_FIELDS.reduce((acc, [target, actual]) => {
              acc[target] = (existing as any)[target];
              acc[actual] = (existing as any)[actual];
              return acc;
            }, {} as Record<string, any>)
          : null;

        // Upsert metrics
        const savedMetric = await prisma.safetyMetrics.upsert({
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

        await auditLogService.logChange({
          companyId: site.companyId,
          siteId,
          userId,
          action: existing ? 'import_update' : 'import_create',
          entityType: 'SafetyMetrics',
          entityId: savedMetric.id,
          oldValues,
          newValues: data,
          ipAddress: auditContext?.ipAddress,
          userAgent: auditContext?.userAgent,
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
  private calculateAllParameterScores(data: any, weights: Record<string, number> = this.PARAMETER_WEIGHTS): any {
    const processedData: any = {};

    // Define parameter mappings (field name -> weight -> isIncident flag -> lowerIsBetter flag)
    const parameters = [
      // Core Performance (2 pts each)
      { target: 'manDaysTarget', actual: 'manDaysActual', score: 'manDaysScore', weight: weights.manDays, isIncident: false, lowerIsBetter: false },
      { target: 'safeWorkHoursTarget', actual: 'safeWorkHoursActual', score: 'safeWorkHoursScore', weight: weights.safeWorkHours, isIncident: false, lowerIsBetter: false },
      { target: 'safetyInductionTarget', actual: 'safetyInductionActual', score: 'safetyInductionScore', weight: weights.safetyInduction, isIncident: false, lowerIsBetter: false },
      { target: 'toolBoxTalkTarget', actual: 'toolBoxTalkActual', score: 'toolBoxTalkScore', weight: weights.toolBoxTalk, isIncident: false, lowerIsBetter: false },
      { target: 'jobSpecificTrainingTarget', actual: 'jobSpecificTrainingActual', score: 'jobSpecificTrainingScore', weight: weights.jobSpecificTraining, isIncident: false, lowerIsBetter: false },
      { target: 'formalSafetyInspectionTarget', actual: 'formalSafetyInspectionActual', score: 'formalSafetyInspectionScore', weight: weights.formalSafetyInspection, isIncident: false, lowerIsBetter: false },
      { target: 'emergencyMockDrillsTarget', actual: 'emergencyMockDrillsActual', score: 'emergencyMockDrillsScore', weight: weights.emergencyMockDrills, isIncident: false, lowerIsBetter: false },
      { target: 'internalAuditTarget', actual: 'internalAuditActual', score: 'internalAuditScore', weight: weights.internalAudit, isIncident: false, lowerIsBetter: false },
      // Leading indicators where "more reporting" is defensibly good, so a
      // blank target with real activity earns full credit instead of 0.
      { target: 'safetyObservationRaisedTarget', actual: 'safetyObservationRaisedActual', score: 'safetyObservationRaisedScore', weight: weights.safetyObservationRaised, isIncident: false, lowerIsBetter: false, blankTargetAwardsFullCredit: true },
      { target: 'workforceTrainedTarget', actual: 'workforceTrainedActual', score: 'workforceTrainedScore', weight: weights.workforceTrainedPercent, isIncident: false, lowerIsBetter: false }, // NEW
      { target: 'ppeObservationsTarget', actual: 'ppeObservationsActual', score: 'ppeObservationsScore', weight: weights.ppeObservations, isIncident: false, lowerIsBetter: false, blankTargetAwardsFullCredit: true }, // NEW
      { target: 'upcomingTrainingsTarget', actual: 'upcomingTrainingsActual', score: 'upcomingTrainingsScore', weight: weights.upcomingTrainings, isIncident: false, lowerIsBetter: false }, // NEW

      // Documentation (1 pt each)
      { target: 'nonComplianceCloseTarget', actual: 'nonComplianceCloseActual', score: 'nonComplianceCloseScore', weight: weights.nonComplianceClose, isIncident: false, lowerIsBetter: false },
      { target: 'safetyObservationCloseTarget', actual: 'safetyObservationCloseActual', score: 'safetyObservationCloseScore', weight: weights.safetyObservationClose, isIncident: false, lowerIsBetter: false },
      { target: 'workPermitIssuedTarget', actual: 'workPermitIssuedActual', score: 'workPermitIssuedScore', weight: weights.workPermitIssued, isIncident: false, lowerIsBetter: false },
      { target: 'safeWorkMethodStatementTarget', actual: 'safeWorkMethodStatementActual', score: 'safeWorkMethodStatementScore', weight: weights.safeWorkMethodStatement, isIncident: false, lowerIsBetter: false },

      // PPE Compliance (2 pts) - NEW
      { target: 'ppeComplianceRateTarget', actual: 'ppeComplianceRateActual', score: 'ppeComplianceRateScore', weight: weights.ppeComplianceRate, isIncident: false, lowerIsBetter: false },

      // Compliance Issues (4 pts) - Binary
      { target: 'nonComplianceRaisedTarget', actual: 'nonComplianceRaisedActual', score: 'nonComplianceRaisedScore', weight: weights.nonComplianceRaised, isIncident: true, lowerIsBetter: false },

      // Training Management (2 pts) - Binary - NEW
      { target: 'overdueTrainingsTarget', actual: 'overdueTrainingsActual', score: 'overdueTrainingsScore', weight: weights.overdueTrainings, isIncident: true, lowerIsBetter: false },

      // Critical Incidents (8 pts each) - Binary
      //
      // Near Miss Report stays on the incident code path (target is always 0
      // by design, so actual=0 still unambiguously means "no data" isn't a
      // concern here) but is marked as a leading indicator: unlike its
      // neighbors below, more reporting reflects a stronger safety culture
      // and should be encouraged, not punished. leadingIndicator skips the
      // severity decay so a non-zero count never drags the score down.
      { target: 'nearMissReportTarget', actual: 'nearMissReportActual', score: 'nearMissReportScore', weight: weights.nearMissReport, isIncident: true, lowerIsBetter: false, leadingIndicator: true },
      { target: 'firstAidInjuryTarget', actual: 'firstAidInjuryActual', score: 'firstAidInjuryScore', weight: weights.firstAidInjury, isIncident: true, lowerIsBetter: false },
      { target: 'medicalTreatmentInjuryTarget', actual: 'medicalTreatmentInjuryActual', score: 'medicalTreatmentInjuryScore', weight: weights.medicalTreatmentInjury, isIncident: true, lowerIsBetter: false },
      // LTIFR = (Lost Time Injuries x 1,000,000) / hours worked - severity
      // normalized by site activity level, not a raw count.
      { target: 'lostTimeInjuryTarget', actual: 'lostTimeInjuryActual', score: 'lostTimeInjuryScore', weight: weights.lostTimeInjury, isIncident: true, lowerIsBetter: false, rateMultiplier: 1_000_000 },
      // TRIR = (Recordable Incidents x 200,000) / hours worked.
      { target: 'recordableIncidentsTarget', actual: 'recordableIncidentsActual', score: 'recordableIncidentsScore', weight: weights.recordableIncidents, isIncident: true, lowerIsBetter: false, rateMultiplier: 200_000 }, // NEW

      // Environment Metrics (2 pts each) - NEW
      { target: 'wasteGeneratedTarget', actual: 'wasteGeneratedActual', score: 'wasteGeneratedScore', weight: weights.wasteGenerated, isIncident: false, lowerIsBetter: true }, // Lower is better
      { target: 'wasteDisposedTarget', actual: 'wasteDisposedActual', score: 'wasteDisposedScore', weight: weights.wasteDisposed, isIncident: false, lowerIsBetter: false }, // Higher is better
      { target: 'energyConsumptionTarget', actual: 'energyConsumptionActual', score: 'energyConsumptionScore', weight: weights.energyConsumption, isIncident: false, lowerIsBetter: true }, // Lower is better
      { target: 'waterConsumptionTarget', actual: 'waterConsumptionActual', score: 'waterConsumptionScore', weight: weights.waterConsumption, isIncident: false, lowerIsBetter: true }, // Lower is better
      { target: 'spillsIncidentsTarget', actual: 'spillsIncidentsActual', score: 'spillsIncidentsScore', weight: weights.spillsIncidents, isIncident: true, lowerIsBetter: false }, // Binary
      { target: 'environmentalIncidentsTarget', actual: 'environmentalIncidentsActual', score: 'environmentalIncidentsScore', weight: weights.environmentalIncidents, isIncident: true, lowerIsBetter: false }, // Binary

      // Health & Hygiene (2 pts each) - NEW
      { target: 'healthCheckupComplianceTarget', actual: 'healthCheckupComplianceActual', score: 'healthCheckupComplianceScore', weight: weights.healthCheckupCompliance, isIncident: false, lowerIsBetter: false },
      { target: 'waterQualityTestTarget', actual: 'waterQualityTestActual', score: 'waterQualityTestScore', weight: weights.waterQualityTest, isIncident: false, lowerIsBetter: false },
    ];

    // Man-hours worked, used to normalize LTIFR/TRIR-style rate-based
    // parameters below — falls back to the plain per-count decay formula
    // when this is missing or zero.
    const hoursWorked = Number(data.safeWorkHoursActual) || 0;

    // Process each parameter
    parameters.forEach(({ target, actual, score, weight, isIncident, lowerIsBetter, blankTargetAwardsFullCredit, leadingIndicator, rateMultiplier }) => {
      if (data[target] !== undefined && data[actual] !== undefined) {
        const targetVal = Number(data[target]) || 0;
        const actualVal = Number(data[actual]) || 0;

        processedData[target] = targetVal;
        processedData[actual] = actualVal;

        // Calculate weighted score but store as 0-10 for DB compatibility
        const weightedScore = this.calculateParameterScore(
          targetVal,
          actualVal,
          weight,
          isIncident,
          lowerIsBetter,
          blankTargetAwardsFullCredit,
          leadingIndicator,
          rateMultiplier,
          hoursWorked
        );
        // Convert back to 0-10 scale for storage (will be converted back when calculating total)
        processedData[score] = (weightedScore / weight) * 10;
      }
    });

    return processedData;
  }
}

export const safetyMetricsService = new SafetyMetricsService();

