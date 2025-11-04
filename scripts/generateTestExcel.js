const XLSX = require('xlsx');

// All 32 parameters with their column headers (Target and Actual for each)
const PARAMETER_COLUMNS = [
  'Month',
  // Operational Metrics (2 parameters = 4 columns)
  'ManDaysTarget', 'ManDaysActual',
  'SafeWorkHoursTarget', 'SafeWorkHoursActual',
  // Training & Induction (6 parameters = 12 columns)
  'SafetyInductionTarget', 'SafetyInductionActual',
  'ToolBoxTalkTarget', 'ToolBoxTalkActual',
  'JobSpecificTrainingTarget', 'JobSpecificTrainingActual',
  'WorkforceTrainedTarget', 'WorkforceTrainedActual',
  'UpcomingTrainingsTarget', 'UpcomingTrainingsActual',
  'OverdueTrainingsTarget', 'OverdueTrainingsActual',
  // Inspection & Compliance (4 parameters = 8 columns)
  'FormalSafetyInspectionTarget', 'FormalSafetyInspectionActual',
  'NonComplianceRaisedTarget', 'NonComplianceRaisedActual',
  'NonComplianceCloseTarget', 'NonComplianceCloseActual',
  'SafetyObservationRaisedTarget', 'SafetyObservationRaisedActual',
  'SafetyObservationCloseTarget', 'SafetyObservationCloseActual',
  // Documentation (2 parameters = 4 columns)
  'WorkPermitIssuedTarget', 'WorkPermitIssuedActual',
  'SafeWorkMethodStatementTarget', 'SafeWorkMethodStatementActual',
  // Emergency & Audit (2 parameters = 4 columns)
  'EmergencyMockDrillsTarget', 'EmergencyMockDrillsActual',
  'InternalAuditTarget', 'InternalAuditActual',
  // Incident Reports (5 parameters = 10 columns)
  'NearMissReportTarget', 'NearMissReportActual',
  'FirstAidInjuryTarget', 'FirstAidInjuryActual',
  'MedicalTreatmentInjuryTarget', 'MedicalTreatmentInjuryActual',
  'LostTimeInjuryTarget', 'LostTimeInjuryActual',
  'RecordableIncidentsTarget', 'RecordableIncidentsActual',
  // PPE Compliance (2 parameters = 4 columns)
  'PPEComplianceRateTarget', 'PPEComplianceRateActual',
  'PPEObservationsTarget', 'PPEObservationsActual',
  // Environment Metrics (6 parameters = 12 columns)
  'WasteGeneratedTarget', 'WasteGeneratedActual',
  'WasteDisposedTarget', 'WasteDisposedActual',
  'EnergyConsumptionTarget', 'EnergyConsumptionActual',
  'WaterConsumptionTarget', 'WaterConsumptionActual',
  'SpillsIncidentsTarget', 'SpillsIncidentsActual',
  'EnvironmentalIncidentsTarget', 'EnvironmentalIncidentsActual',
  // Health & Hygiene (2 parameters = 4 columns)
  'HealthCheckupComplianceTarget', 'HealthCheckupComplianceActual',
  'WaterQualityTestTarget', 'WaterQualityTestActual',
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Helper to generate random value between min and max
function randomValue(min, max, decimals = 0) {
  const value = Math.random() * (max - min) + min;
  return decimals > 0 ? parseFloat(value.toFixed(decimals)) : Math.round(value);
}

// Generate test data for all 12 months
function generateTestData() {
  const data = [];

  MONTHS.forEach((month, index) => {
    const row = { Month: month };

    // Operational Metrics
    row.ManDaysTarget = randomValue(1000, 2000);
    row.ManDaysActual = randomValue(row.ManDaysTarget * 0.8, row.ManDaysTarget * 1.1);
    row.SafeWorkHoursTarget = randomValue(8000, 16000);
    row.SafeWorkHoursActual = randomValue(row.SafeWorkHoursTarget * 0.85, row.SafeWorkHoursTarget * 1.05);

    // Training & Induction
    row.SafetyInductionTarget = randomValue(50, 100);
    row.SafetyInductionActual = randomValue(row.SafetyInductionTarget * 0.8, row.SafetyInductionTarget * 1.1);
    row.ToolBoxTalkTarget = randomValue(20, 40);
    row.ToolBoxTalkActual = randomValue(row.ToolBoxTalkTarget * 0.75, row.ToolBoxTalkTarget * 1.1);
    row.JobSpecificTrainingTarget = randomValue(15, 30);
    row.JobSpecificTrainingActual = randomValue(row.JobSpecificTrainingTarget * 0.8, row.JobSpecificTrainingTarget * 1.05);
    row.WorkforceTrainedTarget = 100;
    row.WorkforceTrainedActual = randomValue(85, 100, 1);
    row.UpcomingTrainingsTarget = randomValue(5, 15);
    row.UpcomingTrainingsActual = randomValue(row.UpcomingTrainingsTarget * 0.7, row.UpcomingTrainingsTarget * 1.2);
    row.OverdueTrainingsTarget = 0;
    row.OverdueTrainingsActual = randomValue(0, 3); // Binary scoring: 0 = good

    // Inspection & Compliance
    row.FormalSafetyInspectionTarget = randomValue(10, 20);
    row.FormalSafetyInspectionActual = randomValue(row.FormalSafetyInspectionTarget * 0.8, row.FormalSafetyInspectionTarget * 1.1);
    row.NonComplianceRaisedTarget = 0; // Binary: 0 is ideal
    row.NonComplianceRaisedActual = randomValue(0, 5);
    row.NonComplianceCloseTarget = randomValue(5, 10);
    row.NonComplianceCloseActual = randomValue(row.NonComplianceCloseTarget * 0.7, row.NonComplianceCloseTarget * 1.0);
    row.SafetyObservationRaisedTarget = randomValue(20, 40);
    row.SafetyObservationRaisedActual = randomValue(row.SafetyObservationRaisedTarget * 0.8, row.SafetyObservationRaisedTarget * 1.2);
    row.SafetyObservationCloseTarget = randomValue(15, 30);
    row.SafetyObservationCloseActual = randomValue(row.SafetyObservationCloseTarget * 0.75, row.SafetyObservationCloseTarget * 1.05);

    // Documentation
    row.WorkPermitIssuedTarget = randomValue(50, 100);
    row.WorkPermitIssuedActual = randomValue(row.WorkPermitIssuedTarget * 0.85, row.WorkPermitIssuedTarget * 1.1);
    row.SafeWorkMethodStatementTarget = randomValue(30, 60);
    row.SafeWorkMethodStatementActual = randomValue(row.SafeWorkMethodStatementTarget * 0.8, row.SafeWorkMethodStatementTarget * 1.05);

    // Emergency & Audit
    row.EmergencyMockDrillsTarget = randomValue(2, 5);
    row.EmergencyMockDrillsActual = randomValue(row.EmergencyMockDrillsTarget * 0.8, row.EmergencyMockDrillsTarget * 1.0);
    row.InternalAuditTarget = randomValue(1, 3);
    row.InternalAuditActual = randomValue(row.InternalAuditTarget * 0.8, row.InternalAuditTarget * 1.2);

    // Incident Reports (Binary: 0 is ideal)
    row.NearMissReportTarget = 0;
    row.NearMissReportActual = randomValue(0, 3);
    row.FirstAidInjuryTarget = 0;
    row.FirstAidInjuryActual = randomValue(0, 2);
    row.MedicalTreatmentInjuryTarget = 0;
    row.MedicalTreatmentInjuryActual = randomValue(0, 1);
    row.LostTimeInjuryTarget = 0;
    row.LostTimeInjuryActual = randomValue(0, 1);
    row.RecordableIncidentsTarget = 0;
    row.RecordableIncidentsActual = randomValue(0, 2);

    // PPE Compliance
    row.PPEComplianceRateTarget = 100;
    row.PPEComplianceRateActual = randomValue(90, 100, 1);
    row.PPEObservationsTarget = randomValue(30, 60);
    row.PPEObservationsActual = randomValue(row.PPEObservationsTarget * 0.8, row.PPEObservationsTarget * 1.1);

    // Environment Metrics
    row.WasteGeneratedTarget = randomValue(500, 1000, 1); // Lower is better
    row.WasteGeneratedActual = randomValue(row.WasteGeneratedTarget * 0.7, row.WasteGeneratedTarget * 1.2, 1);
    row.WasteDisposedTarget = randomValue(400, 800, 1); // Higher is better
    row.WasteDisposedActual = randomValue(row.WasteDisposedTarget * 0.8, row.WasteDisposedTarget * 1.1, 1);
    row.EnergyConsumptionTarget = randomValue(5000, 10000, 1); // Lower is better
    row.EnergyConsumptionActual = randomValue(row.EnergyConsumptionTarget * 0.8, row.EnergyConsumptionTarget * 1.15, 1);
    row.WaterConsumptionTarget = randomValue(2000, 5000, 1); // Lower is better
    row.WaterConsumptionActual = randomValue(row.WaterConsumptionTarget * 0.75, row.WaterConsumptionTarget * 1.2, 1);
    row.SpillsIncidentsTarget = 0; // Binary
    row.SpillsIncidentsActual = randomValue(0, 2);
    row.EnvironmentalIncidentsTarget = 0; // Binary
    row.EnvironmentalIncidentsActual = randomValue(0, 1);

    // Health & Hygiene
    row.HealthCheckupComplianceTarget = 100;
    row.HealthCheckupComplianceActual = randomValue(85, 100, 1);
    row.WaterQualityTestTarget = randomValue(4, 12);
    row.WaterQualityTestActual = randomValue(row.WaterQualityTestTarget * 0.8, row.WaterQualityTestTarget * 1.1);

    data.push(row);
  });

  return data;
}

// Generate and save Excel file
function generateExcelFile() {
  const data = generateTestData();

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Convert data to worksheet
  const ws = XLSX.utils.json_to_sheet(data, { header: PARAMETER_COLUMNS });

  // Set column widths
  const colWidths = PARAMETER_COLUMNS.map(() => ({ wch: 20 }));
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Safety Metrics');

  // Get current year
  const year = new Date().getFullYear();

  // Generate file name
  const fileName = `Safety_Metrics_Test_Data_${year}.xlsx`;

  // Save file
  XLSX.writeFile(wb, fileName);

  console.log('✅ Excel file generated successfully!');
  console.log(`📁 File: ${fileName}`);
  console.log(`📊 Columns: ${PARAMETER_COLUMNS.length} (1 Month + 32 parameters × 2)`);
  console.log(`📅 Months: ${MONTHS.length} (Full year data)`);
  console.log('\n✨ You can now import this file in the Safety Dashboard!');
}

// Run the script
generateExcelFile();
