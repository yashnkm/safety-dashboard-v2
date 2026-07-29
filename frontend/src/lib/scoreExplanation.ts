// Human-readable explanation of exactly which scoring rule produced each
// parameter's Achievement %, for the "how was this scored?" audit drill-down.
//
// SCORE_METHOD mirrors the backend's per-parameter classification
// (backend/src/services/safetyMetrics.service.ts parameter mappings). This is
// display-only — the score itself always comes from the backend; this only
// describes the rule. Keep in sync until scoring config is centralised (audit
// item #1).

export type ScoreMethod =
  | 'ratio' // higher is better: actual ÷ target
  | 'lowerIsBetter' // lower is better: target ÷ actual
  | 'blankFullCredit' // leading indicator, no target: any activity = full marks
  | 'incidentLeading' // reporting encouraged, never penalised (Near Miss)
  | 'incidentCount' // should be zero: weight ÷ (1 + count)
  | 'incidentRate'; // should be zero, rate-based (LTIFR/TRIR) normalised by hours

export const SCORE_METHOD: Record<string, ScoreMethod> = {
  'Man Days': 'ratio',
  'Safe Work Hours Cumulative': 'ratio',
  'Safety Induction': 'ratio',
  'Tool Box Talk': 'ratio',
  'Job Specific Training': 'ratio',
  'Workforce Trained %': 'ratio',
  'Upcoming Trainings': 'blankFullCredit',
  'Overdue Trainings': 'incidentCount',
  'Formal Safety Inspection Done': 'ratio',
  'Non-Compliance Raised': 'incidentCount',
  'Non-Compliance Close': 'ratio',
  'Safety Observation Raised': 'blankFullCredit',
  'Safety Observation Close': 'ratio',
  'Work Permit Issued': 'ratio',
  'Safe Work Method Statement': 'ratio',
  'Emergency Preparedness Mock Drills': 'ratio',
  'Internal Audit': 'ratio',
  'Near Miss Report': 'incidentLeading',
  'First Aid Injury': 'incidentCount',
  'Medical Treatment Injury': 'incidentCount',
  'Lost Time Injury': 'incidentRate',
  'Recordable Incidents': 'incidentRate',
  'PPE Compliance Rate': 'ratio',
  'PPE Observations': 'blankFullCredit',
  'Waste Generated': 'lowerIsBetter',
  'Waste Disposed': 'ratio',
  'Energy Consumption': 'lowerIsBetter',
  'Water Consumption': 'lowerIsBetter',
  'Spills Incidents': 'incidentCount',
  'Environmental Incidents': 'incidentCount',
  'Health Checkup Compliance': 'ratio',
  'Water Quality Test': 'ratio',
};

// Maps a card title to the backend parameter key, so a company's customised
// direction (keyed by param key) can override the default title-based method.
const TITLE_TO_KEY: Record<string, string> = {
  'Man Days': 'manDays',
  'Safe Work Hours Cumulative': 'safeWorkHours',
  'Safety Induction': 'safetyInduction',
  'Tool Box Talk': 'toolBoxTalk',
  'Job Specific Training': 'jobSpecificTraining',
  'Workforce Trained %': 'workforceTrainedPercent',
  'Upcoming Trainings': 'upcomingTrainings',
  'Overdue Trainings': 'overdueTrainings',
  'Formal Safety Inspection Done': 'formalSafetyInspection',
  'Non-Compliance Raised': 'nonComplianceRaised',
  'Non-Compliance Close': 'nonComplianceClose',
  'Safety Observation Raised': 'safetyObservationRaised',
  'Safety Observation Close': 'safetyObservationClose',
  'Work Permit Issued': 'workPermitIssued',
  'Safe Work Method Statement': 'safeWorkMethodStatement',
  'Emergency Preparedness Mock Drills': 'emergencyMockDrills',
  'Internal Audit': 'internalAudit',
  'Near Miss Report': 'nearMissReport',
  'First Aid Injury': 'firstAidInjury',
  'Medical Treatment Injury': 'medicalTreatmentInjury',
  'Lost Time Injury': 'lostTimeInjury',
  'Recordable Incidents': 'recordableIncidents',
  'PPE Compliance Rate': 'ppeComplianceRate',
  'PPE Observations': 'ppeObservations',
  'Waste Generated': 'wasteGenerated',
  'Waste Disposed': 'wasteDisposed',
  'Energy Consumption': 'energyConsumption',
  'Water Consumption': 'waterConsumption',
  'Spills Incidents': 'spillsIncidents',
  'Environmental Incidents': 'environmentalIncidents',
  'Health Checkup Compliance': 'healthCheckupCompliance',
  'Water Quality Test': 'waterQualityTest',
};

// Backend ScoreDirection enum → the display method it corresponds to.
const DIRECTION_TO_METHOD: Record<string, ScoreMethod> = {
  higher: 'ratio',
  higherActivity: 'blankFullCredit',
  lower: 'lowerIsBetter',
  zeroDecay: 'incidentCount',
  zeroLeading: 'incidentLeading',
  rate: 'incidentRate',
};

export interface ScoreExplanation {
  method: string; // short name of the rule
  formula: string; // the formula/rule in words
  calc: string; // the actual numbers plugged in for this parameter
}

interface ExplainInput {
  title: string;
  target: number;
  actual: number;
  score: number; // 0-100 achievement
  weight: number;
  unit?: string;
  isIncident?: boolean;
}

/**
 * Describe how a parameter was scored. `directions` (optional) is the backend's
 * active per-company direction map (paramKey → direction); when it overrides a
 * parameter, the explanation reflects the customised rule rather than the
 * hardcoded default.
 */
export function scoreExplanationFor(
  p: ExplainInput,
  directions?: Record<string, string>
): ScoreExplanation {
  const activeDir = directions?.[TITLE_TO_KEY[p.title]];
  const method = (activeDir && DIRECTION_TO_METHOD[activeDir]) || SCORE_METHOD[p.title] || 'ratio';
  const notReported = !p.isIncident && p.target === 0 && p.actual === 0;
  const u = p.unit ? ' ' + p.unit : '';
  const t = p.target.toLocaleString();
  const a = p.actual.toLocaleString();
  const pct = (Number(p.score) || 0).toFixed(1);

  if (notReported) {
    return {
      method: 'Not Reported',
      formula: 'No target or actual entered',
      calc: 'Shown as "Not Reported" and counts as 0 toward the 100-point total (not treated as a failure).',
    };
  }

  switch (method) {
    case 'lowerIsBetter':
      if (p.actual <= p.target) {
        return { method: 'Lower is better', formula: 'Actual ≤ Target → full marks', calc: `Actual ${a}${u} is within target ${t}${u} → 100%` };
      }
      return { method: 'Lower is better', formula: 'Achievement = Target ÷ Actual', calc: `${t}${u} ÷ ${a}${u} = ${pct}%` };

    case 'blankFullCredit':
      return {
        method: 'Leading indicator (more is better)',
        formula: 'Any reported activity earns full marks',
        calc: p.actual > 0 ? `${a}${u} reported → 100%` : `Nothing reported → 0%`,
      };

    case 'incidentLeading':
      return {
        method: 'Leading indicator — never penalised',
        formula: 'Reporting is encouraged, so any count scores full marks',
        calc: `${a} reported → 100% (more reporting reflects a stronger safety culture)`,
      };

    case 'incidentCount':
      if (p.actual === 0) {
        return { method: 'Should be zero (target = 0)', formula: 'Zero occurrences → full marks', calc: `0 occurrences → 100%` };
      }
      return {
        method: 'Should be zero — severity decay',
        formula: 'Points = Weight ÷ (1 + count)',
        calc: `${p.weight} ÷ (1 + ${p.actual}) = ${(p.weight / (1 + p.actual)).toFixed(2)} of ${p.weight} pts → ${pct}%`,
      };

    case 'incidentRate':
      if (p.actual === 0) {
        return { method: 'Should be zero — rate-based', formula: 'Zero incidents → full marks', calc: `0 incidents → 100%` };
      }
      return {
        method: 'Should be zero — rate-based (LTIFR/TRIR)',
        formula: 'Normalised by hours worked (per-million/200k hours), then decayed',
        calc: `${a} incident(s) scored against hours worked → ${pct}%`,
      };

    case 'ratio':
    default:
      if (p.target === 0) {
        return { method: 'Higher is better', formula: 'Achievement = Actual ÷ Target', calc: `No target set → scores 0 until one is configured` };
      }
      return { method: 'Higher is better', formula: 'Achievement = Actual ÷ Target (capped at 100%)', calc: `${a}${u} ÷ ${t}${u} = ${pct}%` };
  }
}
