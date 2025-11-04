const XLSX = require('xlsx');

// Months array
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Define all 18 parameters with their column headers
const PARAMETER_COLUMNS = [
  { key: 'month', label: 'Month' },
  // Operational Metrics (2)
  { key: 'manDaysTarget', label: 'ManDaysTarget' },
  { key: 'manDaysActual', label: 'ManDaysActual' },
  { key: 'safeWorkHoursTarget', label: 'SafeWorkHoursTarget' },
  { key: 'safeWorkHoursActual', label: 'SafeWorkHoursActual' },
  // Training & Induction (3)
  { key: 'safetyInductionTarget', label: 'SafetyInductionTarget' },
  { key: 'safetyInductionActual', label: 'SafetyInductionActual' },
  { key: 'toolBoxTalkTarget', label: 'ToolBoxTalkTarget' },
  { key: 'toolBoxTalkActual', label: 'ToolBoxTalkActual' },
  { key: 'jobSpecificTrainingTarget', label: 'JobSpecificTrainingTarget' },
  { key: 'jobSpecificTrainingActual', label: 'JobSpecificTrainingActual' },
  // Inspection & Compliance (4)
  { key: 'formalSafetyInspectionTarget', label: 'FormalSafetyInspectionTarget' },
  { key: 'formalSafetyInspectionActual', label: 'FormalSafetyInspectionActual' },
  { key: 'nonComplianceRaisedTarget', label: 'NonComplianceRaisedTarget' },
  { key: 'nonComplianceRaisedActual', label: 'NonComplianceRaisedActual' },
  { key: 'nonComplianceCloseTarget', label: 'NonComplianceCloseTarget' },
  { key: 'nonComplianceCloseActual', label: 'NonComplianceCloseActual' },
  { key: 'safetyObservationRaisedTarget', label: 'SafetyObservationRaisedTarget' },
  { key: 'safetyObservationRaisedActual', label: 'SafetyObservationRaisedActual' },
  { key: 'safetyObservationCloseTarget', label: 'SafetyObservationCloseTarget' },
  { key: 'safetyObservationCloseActual', label: 'SafetyObservationCloseActual' },
  // Documentation (2)
  { key: 'workPermitIssuedTarget', label: 'WorkPermitIssuedTarget' },
  { key: 'workPermitIssuedActual', label: 'WorkPermitIssuedActual' },
  { key: 'safeWorkMethodStatementTarget', label: 'SafeWorkMethodStatementTarget' },
  { key: 'safeWorkMethodStatementActual', label: 'SafeWorkMethodStatementActual' },
  // Emergency & Audit (2)
  { key: 'emergencyMockDrillsTarget', label: 'EmergencyMockDrillsTarget' },
  { key: 'emergencyMockDrillsActual', label: 'EmergencyMockDrillsActual' },
  { key: 'internalAuditTarget', label: 'InternalAuditTarget' },
  { key: 'internalAuditActual', label: 'InternalAuditActual' },
  // Incident Reports (4)
  { key: 'nearMissReportTarget', label: 'NearMissReportTarget' },
  { key: 'nearMissReportActual', label: 'NearMissReportActual' },
  { key: 'firstAidInjuryTarget', label: 'FirstAidInjuryTarget' },
  { key: 'firstAidInjuryActual', label: 'FirstAidInjuryActual' },
  { key: 'medicalTreatmentInjuryTarget', label: 'MedicalTreatmentInjuryTarget' },
  { key: 'medicalTreatmentInjuryActual', label: 'MedicalTreatmentInjuryActual' },
  { key: 'lostTimeInjuryTarget', label: 'LostTimeInjuryTarget' },
  { key: 'lostTimeInjuryActual', label: 'LostTimeInjuryActual' },
];

// Generate random value based on parameter type
function generateRandomValue(key, isTarget) {
  // Incident parameters (target should be 0)
  const incidentParams = [
    'nonComplianceRaised', 'nearMissReport',
    'firstAidInjury', 'medicalTreatmentInjury', 'lostTimeInjury'
  ];

  const isIncident = incidentParams.some(param => key.includes(param));

  if (isIncident) {
    if (isTarget) return 0; // Target for incidents is always 0
    return Math.floor(Math.random() * 3); // Actual 0-2 (low incidents)
  }

  // Different ranges for different parameters
  if (key.includes('manDays')) {
    return isTarget
      ? Math.floor(Math.random() * 200) + 800  // Target: 800-1000
      : Math.floor(Math.random() * 200) + 700; // Actual: 700-900
  }

  if (key.includes('safeWorkHours')) {
    return isTarget
      ? Math.floor(Math.random() * 1000) + 7000  // Target: 7000-8000
      : Math.floor(Math.random() * 1000) + 6500; // Actual: 6500-7500
  }

  if (key.includes('safetyInduction') || key.includes('toolBoxTalk') ||
      key.includes('jobSpecificTraining')) {
    return isTarget
      ? Math.floor(Math.random() * 20) + 30  // Target: 30-50
      : Math.floor(Math.random() * 20) + 25; // Actual: 25-45
  }

  if (key.includes('workPermit')) {
    return isTarget
      ? Math.floor(Math.random() * 50) + 80  // Target: 80-130
      : Math.floor(Math.random() * 50) + 70; // Actual: 70-120
  }

  if (key.includes('emergencyMockDrills') || key.includes('internalAudit')) {
    return isTarget
      ? Math.floor(Math.random() * 2) + 1  // Target: 1-2
      : Math.floor(Math.random() * 2) + 0; // Actual: 0-1
  }

  if (key.includes('Close')) {
    return isTarget
      ? 100  // Target: 100% closure
      : Math.floor(Math.random() * 20) + 80; // Actual: 80-100
  }

  // Default for other parameters
  return isTarget
    ? Math.floor(Math.random() * 20) + 10  // Target: 10-30
    : Math.floor(Math.random() * 20) + 8;  // Actual: 8-28
}

// Generate data for random months (between 4-10 months)
function generateRandomMonthsData() {
  const numMonths = Math.floor(Math.random() * 7) + 4; // 4-10 months

  // Shuffle months and pick random ones
  const shuffledMonths = [...MONTHS].sort(() => Math.random() - 0.5);
  const selectedMonths = shuffledMonths.slice(0, numMonths).sort((a, b) => {
    return MONTHS.indexOf(a) - MONTHS.indexOf(b);
  });

  const data = selectedMonths.map(month => {
    const row = { Month: month };

    PARAMETER_COLUMNS.slice(1).forEach(col => {
      const isTarget = col.key.includes('Target');
      row[col.label] = generateRandomValue(col.key, isTarget);
    });

    return row;
  });

  return data;
}

// Main function
function generateExcel() {
  console.log('🎲 Generating random safety metrics data...\n');

  const data = generateRandomMonthsData();

  console.log(`📅 Generated ${data.length} months of data:`);
  data.forEach(row => console.log(`   - ${row.Month}`));

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths
  const colWidths = PARAMETER_COLUMNS.map(() => ({ wch: 20 }));
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Safety Metrics');

  // Generate file name with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const fileName = `Sample_Safety_Metrics_${timestamp}.xlsx`;

  // Write file
  XLSX.writeFile(wb, fileName);

  console.log(`\n✅ Sample Excel file created: ${fileName}`);
  console.log(`📊 Total columns: ${PARAMETER_COLUMNS.length} (1 Month + ${(PARAMETER_COLUMNS.length - 1) / 2} parameters × 2)`);
  console.log(`\n💡 You can now upload this file in the Excel Import page!`);
}

// Run the script
generateExcel();
