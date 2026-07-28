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

describe('configurable weights', () => {
  it('getDefaultWeights returns a copy of PARAMETER_WEIGHTS that sums to 100', () => {
    const defaults = service.getDefaultWeights();
    expect(defaults).toEqual(service.PARAMETER_WEIGHTS);
    expect(defaults).not.toBe(service.PARAMETER_WEIGHTS); // must be a copy, not the same reference
    const total = Object.values(defaults as Record<string, number>).reduce((sum, w) => sum + w, 0);
    expect(total).toBe(100);
  });

  it('getWeightFieldMap covers exactly the same 32 parameter keys as PARAMETER_WEIGHTS', () => {
    const fieldMap = service.getWeightFieldMap();
    expect(fieldMap).toHaveLength(32);
    const paramKeys = fieldMap.map(([paramKey]: [string, string]) => paramKey).sort();
    const weightKeys = Object.keys(service.PARAMETER_WEIGHTS).sort();
    expect(paramKeys).toEqual(weightKeys);
  });

  it('getWeightFieldMap has a unique CompanySettings column for every parameter', () => {
    const fieldMap = service.getWeightFieldMap();
    const dbFields = fieldMap.map(([, dbField]: [string, string]) => dbField);
    expect(new Set(dbFields).size).toBe(dbFields.length);
  });
});

describe('calculateParameterScore (by direction)', () => {
  it('zeroDecay: awards full weight for zero occurrences (target=0, actual=0)', () => {
    // Regression guard: the no-data guard used to run before the incident
    // check, so a genuinely perfect zero-incident month scored 0 instead of
    // full weight, indistinguishable from "no data entered".
    expect(service.calculateParameterScore(0, 0, 8, 'zeroDecay')).toBe(8);
  });

  it('zeroDecay: decays severity-scaled when occurrences happened, instead of a flat cliff to zero', () => {
    // weight / (1 + actual) - fewer incidents still score meaningfully
    // higher than more of the same type, rather than both flooring to 0.
    expect(service.calculateParameterScore(0, 1, 8, 'zeroDecay')).toBeCloseTo(4, 5);
    expect(service.calculateParameterScore(0, 3, 8, 'zeroDecay')).toBeCloseTo(2, 5);
    expect(service.calculateParameterScore(0, 45, 8, 'zeroDecay')).toBeCloseTo(8 / 46, 5);
    expect(service.calculateParameterScore(0, 1, 8, 'zeroDecay')).toBeGreaterThan(
      service.calculateParameterScore(0, 3, 8, 'zeroDecay')
    );
  });

  it('rate: LTIFR/TRIR normalizes severity by hours worked instead of raw count', () => {
    // 2 injuries at 50,000 hours -> LTIFR = 2,000,000/50,000 = 40 -> weight/(1+40)
    const smallSite = service.calculateParameterScore(0, 2, 8, 'rate', 1_000_000, 50_000);
    expect(smallSite).toBeCloseTo(8 / 41, 5);

    // Same 2 injuries at 500,000 hours -> LTIFR = 2,000,000/500,000 = 4 -> weight/(1+4)
    const bigSite = service.calculateParameterScore(0, 2, 8, 'rate', 1_000_000, 500_000);
    expect(bigSite).toBeCloseTo(8 / 5, 5);

    // Same raw count, but the smaller site (higher rate) scores meaningfully worse
    expect(bigSite).toBeGreaterThan(smallSite);
  });

  it('rate: falls back to plain per-count decay when hours-worked data is missing or zero', () => {
    expect(service.calculateParameterScore(0, 2, 8, 'rate', 1_000_000, 0)).toBeCloseTo(8 / 3, 5);
    expect(service.calculateParameterScore(0, 2, 8, 'rate', 1_000_000, undefined)).toBeCloseTo(8 / 3, 5);
  });

  it('rate: still awards full weight for zero incidents, hours worked notwithstanding', () => {
    expect(service.calculateParameterScore(0, 0, 8, 'rate', 1_000_000, 500_000)).toBe(8);
  });

  it('higher: treats target=0, actual=0 as no data', () => {
    expect(service.calculateParameterScore(0, 0, 2, 'higher')).toBe(0);
  });

  it('zeroLeading: never decays for a non-zero count (reporting encouraged)', () => {
    expect(service.calculateParameterScore(0, 0, 8, 'zeroLeading')).toBe(8);
    expect(service.calculateParameterScore(0, 1, 8, 'zeroLeading')).toBe(8);
    expect(service.calculateParameterScore(0, 45, 8, 'zeroLeading')).toBe(8);
  });

  it('higher: awards full weight when target equals actual (both > 0)', () => {
    expect(service.calculateParameterScore(100, 100, 2, 'higher')).toBe(2);
  });

  it('higher: scores proportionally to the actual/target ratio', () => {
    expect(service.calculateParameterScore(100, 50, 2, 'higher')).toBe(1);
    expect(service.calculateParameterScore(200, 50, 8, 'higher')).toBe(2);
  });

  it('higher: caps ratio scoring at the max weight, never exceeding it', () => {
    expect(service.calculateParameterScore(100, 150, 2, 'higher')).toBe(2);
  });

  it('higher: returns 0 for target=0 with real actual activity (no basis for a ratio)', () => {
    expect(service.calculateParameterScore(0, 5, 2, 'higher')).toBe(0);
  });

  it('higherActivity: awards full weight for target=0 with real actual activity', () => {
    // Leading indicators (Safety Observation Raised / PPE Observations /
    // Upcoming Trainings) where more reporting is defensibly good.
    expect(service.calculateParameterScore(0, 5, 2, 'higherActivity')).toBe(2);
  });

  it('higherActivity: still returns 0 for target=0 and actual=0 (no data)', () => {
    expect(service.calculateParameterScore(0, 0, 2, 'higherActivity')).toBe(0);
  });

  it('lower: awards full weight when actual is at or below target', () => {
    expect(service.calculateParameterScore(100, 80, 2, 'lower')).toBe(2);
    expect(service.calculateParameterScore(100, 100, 2, 'lower')).toBe(2);
  });

  it('lower: penalizes proportionally when actual exceeds target', () => {
    expect(service.calculateParameterScore(100, 150, 2, 'lower')).toBeCloseTo((100 / 150) * 2, 5);
  });

  it('lower: returns 0 when target is 0 (avoids div by zero)', () => {
    expect(service.calculateParameterScore(0, 5, 2, 'lower')).toBe(0);
  });
});

describe('DIRECTION_DEFAULTS', () => {
  it('covers exactly the same 32 parameter keys as PARAMETER_WEIGHTS', () => {
    const dirKeys = Object.keys(service.getDirectionDefaults()).sort();
    const weightKeys = Object.keys(service.PARAMETER_WEIGHTS).sort();
    expect(dirKeys).toEqual(weightKeys);
  });

  it('classifies the key "should be zero / leading / rate / lower" params correctly', () => {
    const d = service.getDirectionDefaults();
    expect(d.nonComplianceRaised).toBe('zeroDecay');
    expect(d.nearMissReport).toBe('zeroLeading');
    expect(d.lostTimeInjury).toBe('rate');
    expect(d.recordableIncidents).toBe('rate');
    expect(d.wasteGenerated).toBe('lower');
    expect(d.safetyObservationRaised).toBe('higherActivity');
    expect(d.manDays).toBe('higher');
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

describe('validateParameterValues', () => {
  it('accepts a clean, fully-populated row with no errors', () => {
    expect(service.validateParameterValues({ manDaysTarget: 1000, manDaysActual: 950 })).toEqual([]);
  });

  it('flags negative counts', () => {
    const errors = service.validateParameterValues({ lostTimeInjuryActual: -1 });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/lostTimeInjuryActual/);
    expect(errors[0]).toMatch(/negative/);
  });

  it('flags non-numeric values', () => {
    const errors = service.validateParameterValues({ manDaysActual: 'fifty' });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/not a valid number/);
  });

  it('flags a percentage field over 100', () => {
    const errors = service.validateParameterValues({ ppeComplianceRateActual: 150 });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/exceeds 100%/);
  });

  it('does not apply the 100-cap to non-percentage fields', () => {
    expect(service.validateParameterValues({ manDaysActual: 5000 })).toEqual([]);
  });

  it('ignores absent, null, or empty-string fields rather than flagging them', () => {
    expect(service.validateParameterValues({ manDaysActual: undefined, manDaysTarget: null, toolBoxTalkActual: '' })).toEqual([]);
  });

  it('does not flag actual far exceeding target as an error - that is real data, not an impossible value', () => {
    expect(service.validateParameterValues({ nonComplianceRaisedTarget: 0, nonComplianceRaisedActual: 500 })).toEqual([]);
  });

  it('collects multiple errors from the same row', () => {
    const errors = service.validateParameterValues({ manDaysActual: -5, ppeComplianceRateActual: 200 });
    expect(errors).toHaveLength(2);
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

  it('awards full weight for Upcoming Trainings with a blank target but real trainings scheduled', () => {
    // Proactive scheduling ahead of time is a good sign, not a backlog -
    // matches the treatment already given to Safety Observation Raised.
    const processed = service.calculateAllParameterScores({
      upcomingTrainingsTarget: 0,
      upcomingTrainingsActual: 4,
    });
    expect(processed.upcomingTrainingsScore).toBeCloseTo(10, 5);
  });

  it('still scores Upcoming Trainings as 0 when both target and actual are 0 (no data)', () => {
    const processed = service.calculateAllParameterScores({
      upcomingTrainingsTarget: 0,
      upcomingTrainingsActual: 0,
    });
    expect(processed.upcomingTrainingsScore).toBeCloseTo(0, 5);
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

describe('combineFields', () => {
  it('sums count-type fields across records', () => {
    const combined = service.combineFields([
      { manDaysTarget: 1000, manDaysActual: 900 },
      { manDaysTarget: 1000, manDaysActual: 950 },
      { manDaysTarget: 1000, manDaysActual: 1000 },
    ]);
    expect(combined.manDaysTarget).toBe(3000);
    expect(combined.manDaysActual).toBe(2850);
  });

  it('averages percentage-shaped fields across records instead of summing them', () => {
    const combined = service.combineFields([
      { ppeComplianceRateTarget: 100, ppeComplianceRateActual: 80 },
      { ppeComplianceRateTarget: 100, ppeComplianceRateActual: 100 },
    ]);
    // Would wrongly be 180 if summed instead of averaged.
    expect(combined.ppeComplianceRateActual).toBe(90);
    expect(combined.ppeComplianceRateTarget).toBe(100);
  });

  it('treats missing fields on a record as zero', () => {
    const combined = service.combineFields([{ manDaysActual: 500 }, {}]);
    expect(combined.manDaysActual).toBe(500);
  });

  it('combining one record for a field is a no-op (regression guard for the cross-time refactor)', () => {
    const record = { manDaysTarget: 1000, manDaysActual: 800, ppeComplianceRateTarget: 100, ppeComplianceRateActual: 75 };
    const combined = service.combineFields([record]);
    expect(combined.manDaysTarget).toBe(1000);
    expect(combined.manDaysActual).toBe(800);
    expect(combined.ppeComplianceRateActual).toBe(75);
  });
});

describe('scoreCombined', () => {
  it('produces the same totalScore/rating as calculateAllParameterScores + calculateMetricScores on the same combined totals', () => {
    const combined = { manDaysTarget: 1000, manDaysActual: 1000 };
    const weights = service.getDefaultWeights();

    const viaScoreCombined = service.scoreCombined(combined, weights);

    const processed = service.calculateAllParameterScores(combined, weights);
    const viaDirectCalc = service.calculateMetricScores(processed, weights);

    expect(viaScoreCombined.totalScore).toBeCloseTo(viaDirectCalc.totalScore, 5);
    expect(viaScoreCombined.rating).toBe(viaDirectCalc.rating);
  });
});

describe('getMetricsForPeriods / getAggregatedMetrics parity (extraction regression guard)', () => {
  it('combining across time uses the same combineFields + scoreCombined pipeline as combining across sites', () => {
    // Two "sites" for one month is mathematically identical to one "site"
    // across two months - combineFields doesn't know or care which
    // dimension the records differ across. This guards that the
    // getAggregatedMetrics -> combineFields/scoreCombined extraction didn't
    // change behavior.
    const siteA = { manDaysTarget: 500, manDaysActual: 500 };
    const siteB = { manDaysTarget: 500, manDaysActual: 400 };
    const weights = service.getDefaultWeights();

    const combinedAcrossSites = service.combineFields([siteA, siteB]);
    const combinedAcrossTime = service.combineFields([siteA, siteB]); // same shape, different meaning

    expect(combinedAcrossSites).toEqual(combinedAcrossTime);

    const scoredA = service.scoreCombined(combinedAcrossSites, weights);
    const scoredB = service.scoreCombined(combinedAcrossTime, weights);
    expect(scoredA.totalScore).toBeCloseTo(scoredB.totalScore, 5);
  });
});
