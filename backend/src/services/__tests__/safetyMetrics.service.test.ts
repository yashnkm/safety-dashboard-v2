import { describe, it, expect } from 'vitest';
import { safetyMetricsService } from '../safetyMetrics.service';

// The methods under test are declared `private` in the TS class — that's a
// compile-time-only restriction, so we cast to `any` to reach them directly
// rather than only exercising them indirectly through the public API.
const service = safetyMetricsService as any;

// All 32 *Score column names calculateMetricScores() reads, in the same
// 0-10 scale they're stored in the database.
const ALL_SCORE_FIELDS = [
  'nearMissReportScore',
  'firstAidInjuryScore',
  'medicalTreatmentInjuryScore',
  'lostTimeInjuryScore',
  'recordableIncidentsScore',
  'nonComplianceRaisedScore',
  'manDaysScore',
  'safeWorkHoursScore',
  'safetyInductionScore',
  'toolBoxTalkScore',
  'jobSpecificTrainingScore',
  'formalSafetyInspectionScore',
  'emergencyMockDrillsScore',
  'internalAuditScore',
  'safetyObservationRaisedScore',
  'workforceTrainedScore',
  'ppeObservationsScore',
  'upcomingTrainingsScore',
  'nonComplianceCloseScore',
  'safetyObservationCloseScore',
  'workPermitIssuedScore',
  'safeWorkMethodStatementScore',
  'ppeComplianceRateScore',
  'overdueTrainingsScore',
  'wasteGeneratedScore',
  'wasteDisposedScore',
  'energyConsumptionScore',
  'waterConsumptionScore',
  'spillsIncidentsScore',
  'environmentalIncidentsScore',
  'healthCheckupComplianceScore',
  'waterQualityTestScore',
];

function allMaxScores(): Record<string, number> {
  const metric: Record<string, number> = {
    // At least one real target/actual pair, so hasNoData() doesn't treat
    // this as an empty record — calculateMetricScores() itself only reads
    // the *Score fields below, this pair just needs to exist.
    manDaysTarget: 1000,
    manDaysActual: 1000,
  };
  for (const field of ALL_SCORE_FIELDS) metric[field] = 10;
  return metric;
}

describe('PARAMETER_WEIGHTS', () => {
  it('sums to exactly 100 points', () => {
    // Regression guard for the bug where this silently summed to 92 —
    // capping every "perfect" month at 92% no matter what.
    const total = Object.values(service.PARAMETER_WEIGHTS as Record<string, number>).reduce(
      (sum, w) => sum + w,
      0
    );
    expect(total).toBe(100);
  });

  it('covers exactly 32 parameters', () => {
    expect(Object.keys(service.PARAMETER_WEIGHTS).length).toBe(32);
  });
});

describe('calculateParameterScore', () => {
  it('awards full weight for zero incidents (target=0, actual=0)', () => {
    // Regression guard: the no-data guard used to run before the incident
    // check, so a genuinely perfect zero-incident month scored 0 instead of
    // full weight, indistinguishable from "no data entered".
    expect(service.calculateParameterScore(0, 0, 8, true, false)).toBe(8);
  });

  it('decays severity-scaled when incidents occurred, instead of a flat cliff to zero', () => {
    // weight / (1 + actual) - fewer incidents still score meaningfully
    // higher than more of the same type, rather than both flooring to 0.
    expect(service.calculateParameterScore(0, 1, 8, true, false)).toBeCloseTo(4, 5);
    expect(service.calculateParameterScore(0, 3, 8, true, false)).toBeCloseTo(2, 5);
    expect(service.calculateParameterScore(0, 45, 8, true, false)).toBeCloseTo(8 / 46, 5);
    expect(service.calculateParameterScore(0, 1, 8, true, false)).toBeGreaterThan(
      service.calculateParameterScore(0, 3, 8, true, false)
    );
  });

  it('treats target=0, actual=0 as no data for non-incident parameters', () => {
    expect(service.calculateParameterScore(0, 0, 2, false, false)).toBe(0);
  });

  it('leading indicators (e.g. Near Miss Report) never decay for a non-zero count', () => {
    // Unlike true incidents, reporting more shouldn't hurt the score - both
    // zero and non-zero counts score full weight.
    expect(service.calculateParameterScore(0, 0, 8, true, false, false, true)).toBe(8);
    expect(service.calculateParameterScore(0, 1, 8, true, false, false, true)).toBe(8);
    expect(service.calculateParameterScore(0, 45, 8, true, false, false, true)).toBe(8);
  });

  it('awards full weight when target equals actual (both > 0)', () => {
    expect(service.calculateParameterScore(100, 100, 2, false, false)).toBe(2);
  });

  it('scores proportionally to the actual/target ratio', () => {
    expect(service.calculateParameterScore(100, 50, 2, false, false)).toBe(1);
    expect(service.calculateParameterScore(200, 50, 8, false, false)).toBe(2);
  });

  it('caps ratio scoring at the max weight, never exceeding it', () => {
    expect(service.calculateParameterScore(100, 150, 2, false, false)).toBe(2);
  });

  it('returns 0 by default for a positive-ratio parameter with target=0, even with real actual activity', () => {
    // blankTargetAwardsFullCredit defaults to false - most ratio parameters
    // (e.g. Upcoming Trainings) have no basis for treating "more" as
    // automatically good, so a blank target stays a 0 until a real target
    // is configured.
    expect(service.calculateParameterScore(0, 5, 2, false, false)).toBe(0);
  });

  it('awards full weight for a positive-ratio parameter with target=0 and real actual activity, when opted in', () => {
    // blankTargetAwardsFullCredit=true is reserved for leading indicators
    // like Safety Observation Raised / PPE Observations, where more
    // reporting is defensibly good and there's no target to compute a
    // ratio against.
    expect(service.calculateParameterScore(0, 5, 2, false, false, true)).toBe(2);
  });

  it('still returns 0 for a positive-ratio parameter with target=0 and actual=0 (no data), even when opted in', () => {
    expect(service.calculateParameterScore(0, 0, 2, false, false, true)).toBe(0);
  });

  it('lowerIsBetter: awards full weight when actual is at or below target', () => {
    expect(service.calculateParameterScore(100, 80, 2, false, true)).toBe(2);
    expect(service.calculateParameterScore(100, 100, 2, false, true)).toBe(2);
  });

  it('lowerIsBetter: penalizes proportionally when actual exceeds target', () => {
    // ratio = target/actual = 100/150, score = ratio * weight
    expect(service.calculateParameterScore(100, 150, 2, false, true)).toBeCloseTo((100 / 150) * 2, 5);
  });

  it('lowerIsBetter: returns 0 when target is 0 (avoids div by zero)', () => {
    expect(service.calculateParameterScore(0, 5, 2, false, true)).toBe(0);
  });
});

describe('hasNoData', () => {
  it('is true when every target/actual field is zero or missing', () => {
    expect(service.hasNoData({})).toBe(true);
    expect(service.hasNoData({ manDaysTarget: 0, manDaysActual: 0 })).toBe(true);
  });

  it('is false as soon as any single field is non-zero', () => {
    expect(service.hasNoData({ manDaysTarget: 1000, manDaysActual: 900 })).toBe(false);
    expect(service.hasNoData({ nearMissReportActual: 2 })).toBe(false);
  });
});

describe('calculateMetricScores', () => {
  it('scores a completely empty record as 0/LOW, never a false 100%', () => {
    // Regression guard: this used to blindly trust whatever was sitting in
    // the *Score columns, so a row with no real data but stale/placeholder
    // scores could render as a perfect month.
    const result = service.calculateMetricScores({});
    expect(result.totalScore).toBe(0);
    expect(result.percentage).toBe(0);
    expect(result.rating).toBe('LOW');
  });

  it('scores a record with every parameter maxed out as exactly 100/HIGH', () => {
    const result = service.calculateMetricScores(allMaxScores());
    expect(result.totalScore).toBe(100);
    expect(result.percentage).toBe(100);
    expect(result.rating).toBe('HIGH');
  });

  it('applies rating thresholds at the documented boundaries', () => {
    const at = (percentPoints: number) => {
      // Scale every score down uniformly so the weighted total lands at
      // exactly percentPoints (weights sum to 100, so scaling all scores by
      // the same fraction scales the total by that same fraction).
      const metric = allMaxScores();
      for (const field of ALL_SCORE_FIELDS) {
        metric[field] = (metric[field] * percentPoints) / 100;
      }
      return service.calculateMetricScores(metric).rating;
    };

    expect(at(30.99)).toBe('LOW');
    expect(at(31)).toBe('MEDIUM');
    expect(at(70.99)).toBe('MEDIUM');
    expect(at(71)).toBe('HIGH');
  });
});

describe('calculateAllParameterScores', () => {
  it('derives correct scores for ratio, incident, and lowerIsBetter parameters together', () => {
    const processed = service.calculateAllParameterScores({
      manDaysTarget: 100,
      manDaysActual: 50,
      nearMissReportTarget: 0,
      nearMissReportActual: 0,
      wasteGeneratedTarget: 100,
      wasteGeneratedActual: 150,
    });

    // manDays: ratio 0.5 * weight 2 = 1, stored as (1/2)*10 = 5 on the 0-10 scale
    expect(processed.manDaysScore).toBeCloseTo(5, 5);

    // nearMissReport: zero incidents = full weight 8, stored as (8/8)*10 = 10
    expect(processed.nearMissReportScore).toBeCloseTo(10, 5);

    // wasteGenerated (lowerIsBetter): ratio 100/150 * weight 2, stored on 0-10 scale
    const expectedWasteWeighted = (100 / 150) * 2;
    expect(processed.wasteGeneratedScore).toBeCloseTo((expectedWasteWeighted / 2) * 10, 5);
  });

  it('leaves parameters absent from input untouched (no target/actual pair supplied)', () => {
    const processed = service.calculateAllParameterScores({ manDaysTarget: 100, manDaysActual: 100 });
    expect(processed.safeWorkHoursScore).toBeUndefined();
    expect(processed.manDaysScore).toBeCloseTo(10, 5);
  });
});

describe('end-to-end: import → total score', () => {
  it('a fully perfect month (every ratio met, zero incidents) scores 100/HIGH', () => {
    const perfectMonthInput = {
      manDaysTarget: 1000, manDaysActual: 1000,
      safeWorkHoursTarget: 8000, safeWorkHoursActual: 8000,
      safetyInductionTarget: 50, safetyInductionActual: 50,
      toolBoxTalkTarget: 20, toolBoxTalkActual: 20,
      jobSpecificTrainingTarget: 30, jobSpecificTrainingActual: 30,
      formalSafetyInspectionTarget: 10, formalSafetyInspectionActual: 10,
      emergencyMockDrillsTarget: 2, emergencyMockDrillsActual: 2,
      internalAuditTarget: 1, internalAuditActual: 1,
      safetyObservationRaisedTarget: 50, safetyObservationRaisedActual: 50,
      workforceTrainedTarget: 100, workforceTrainedActual: 100,
      ppeObservationsTarget: 20, ppeObservationsActual: 20,
      upcomingTrainingsTarget: 5, upcomingTrainingsActual: 5,
      nonComplianceCloseTarget: 100, nonComplianceCloseActual: 100,
      safetyObservationCloseTarget: 100, safetyObservationCloseActual: 100,
      workPermitIssuedTarget: 100, workPermitIssuedActual: 100,
      safeWorkMethodStatementTarget: 50, safeWorkMethodStatementActual: 50,
      ppeComplianceRateTarget: 100, ppeComplianceRateActual: 100,
      wasteGeneratedTarget: 100, wasteGeneratedActual: 80,
      wasteDisposedTarget: 100, wasteDisposedActual: 100,
      energyConsumptionTarget: 100, energyConsumptionActual: 90,
      waterConsumptionTarget: 100, waterConsumptionActual: 90,
      healthCheckupComplianceTarget: 100, healthCheckupComplianceActual: 100,
      waterQualityTestTarget: 4, waterQualityTestActual: 4,
      // All incident/binary parameters: zero occurrences
      nonComplianceRaisedTarget: 0, nonComplianceRaisedActual: 0,
      overdueTrainingsTarget: 0, overdueTrainingsActual: 0,
      nearMissReportTarget: 0, nearMissReportActual: 0,
      firstAidInjuryTarget: 0, firstAidInjuryActual: 0,
      medicalTreatmentInjuryTarget: 0, medicalTreatmentInjuryActual: 0,
      lostTimeInjuryTarget: 0, lostTimeInjuryActual: 0,
      recordableIncidentsTarget: 0, recordableIncidentsActual: 0,
      spillsIncidentsTarget: 0, spillsIncidentsActual: 0,
      environmentalIncidentsTarget: 0, environmentalIncidentsActual: 0,
    };

    const processed = service.calculateAllParameterScores(perfectMonthInput);
    const result = service.calculateMetricScores(processed);

    expect(result.totalScore).toBeCloseTo(100, 5);
    expect(result.rating).toBe('HIGH');
  });

  it('a single real incident meaningfully drags down an otherwise perfect month', () => {
    const perfectExceptOneIncident = {
      manDaysTarget: 1000, manDaysActual: 1000,
      nearMissReportTarget: 0, nearMissReportActual: 0,
      firstAidInjuryTarget: 0, firstAidInjuryActual: 0,
      medicalTreatmentInjuryTarget: 0, medicalTreatmentInjuryActual: 0,
      lostTimeInjuryTarget: 0, lostTimeInjuryActual: 1, // one LTI occurred (weight 8)
      recordableIncidentsTarget: 0, recordableIncidentsActual: 0,
    };

    const processed = service.calculateAllParameterScores(perfectExceptOneIncident);
    const result = service.calculateMetricScores(processed);

    // manDays (2 pts) + nearMiss/firstAid/MTI/recordable (8 pts each, zero
    // incidents) = 34, plus LTI's severity-decayed score for 1 incident:
    // 8 / (1 + 1) = 4 (half weight, not zero).
    expect(result.totalScore).toBeCloseTo(2 + 8 + 8 + 8 + 8 + 4, 5);
    expect(result.totalScore).toBeLessThan(40);
  });
});
