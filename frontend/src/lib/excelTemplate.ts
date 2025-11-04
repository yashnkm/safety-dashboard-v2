import * as XLSX from 'xlsx';

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Define all 32 parameters with their column headers (18 original + 14 new)
export const PARAMETER_COLUMNS = [
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
  // NEW: Recordable Incidents (1)
  { key: 'recordableIncidentsTarget', label: 'RecordableIncidentsTarget' },
  { key: 'recordableIncidentsActual', label: 'RecordableIncidentsActual' },
  // NEW: PPE Compliance (2)
  { key: 'ppeComplianceRateTarget', label: 'PPEComplianceRateTarget' },
  { key: 'ppeComplianceRateActual', label: 'PPEComplianceRateActual' },
  { key: 'ppeObservationsTarget', label: 'PPEObservationsTarget' },
  { key: 'ppeObservationsActual', label: 'PPEObservationsActual' },
  // NEW: Training Management (3)
  { key: 'workforceTrainedTarget', label: 'WorkforceTrainedTarget' },
  { key: 'workforceTrainedActual', label: 'WorkforceTrainedActual' },
  { key: 'upcomingTrainingsTarget', label: 'UpcomingTrainingsTarget' },
  { key: 'upcomingTrainingsActual', label: 'UpcomingTrainingsActual' },
  { key: 'overdueTrainingsTarget', label: 'OverdueTrainingsTarget' },
  { key: 'overdueTrainingsActual', label: 'OverdueTrainingsActual' },
  // NEW: Environment Metrics (6)
  { key: 'wasteGeneratedTarget', label: 'WasteGeneratedTarget' },
  { key: 'wasteGeneratedActual', label: 'WasteGeneratedActual' },
  { key: 'wasteDisposedTarget', label: 'WasteDisposedTarget' },
  { key: 'wasteDisposedActual', label: 'WasteDisposedActual' },
  { key: 'energyConsumptionTarget', label: 'EnergyConsumptionTarget' },
  { key: 'energyConsumptionActual', label: 'EnergyConsumptionActual' },
  { key: 'waterConsumptionTarget', label: 'WaterConsumptionTarget' },
  { key: 'waterConsumptionActual', label: 'WaterConsumptionActual' },
  { key: 'spillsIncidentsTarget', label: 'SpillsIncidentsTarget' },
  { key: 'spillsIncidentsActual', label: 'SpillsIncidentsActual' },
  { key: 'environmentalIncidentsTarget', label: 'EnvironmentalIncidentsTarget' },
  { key: 'environmentalIncidentsActual', label: 'EnvironmentalIncidentsActual' },
  // NEW: Health & Hygiene (2)
  { key: 'healthCheckupComplianceTarget', label: 'HealthCheckupComplianceTarget' },
  { key: 'healthCheckupComplianceActual', label: 'HealthCheckupComplianceActual' },
  { key: 'waterQualityTestTarget', label: 'WaterQualityTestTarget' },
  { key: 'waterQualityTestActual', label: 'WaterQualityTestActual' },
];

/**
 * Generate and download Excel template
 */
export function downloadExcelTemplate(year: number = new Date().getFullYear()) {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Create header row
  const headers = PARAMETER_COLUMNS.map(col => col.label);

  // Create data rows for all 12 months with empty values
  const data = MONTHS.map(month => {
    const row: any = { Month: month };
    PARAMETER_COLUMNS.slice(1).forEach(col => {
      row[col.label] = '';
    });
    return row;
  });

  // Convert to worksheet
  const ws = XLSX.utils.json_to_sheet(data, { header: headers });

  // Set column widths
  const colWidths = PARAMETER_COLUMNS.map(() => ({ wch: 20 }));
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Safety Metrics');

  // Generate file name
  const fileName = `Safety_Metrics_Template_${year}.xlsx`;

  // Download file
  XLSX.writeFile(wb, fileName);
}

/**
 * Parse uploaded Excel file and extract data
 */
export function parseExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // Get first worksheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        // Map column names to our expected keys
        const mappedData = jsonData.map((row: any) => {
          const mappedRow: any = {};

          PARAMETER_COLUMNS.forEach(col => {
            // Try to find the value with case-insensitive matching
            // Use ?? (nullish coalescing) to preserve 0 values
            let value = row[col.label];
            if (value === undefined || value === null) {
              value = row[col.label.toLowerCase()];
            }
            if (value === undefined || value === null) {
              value = row[col.key];
            }
            mappedRow[col.key] = value;
          });

          return mappedRow;
        });

        resolve(mappedData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Validate parsed Excel data
 */
export function validateExcelData(data: any[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check if data is not empty
  if (!data || data.length === 0) {
    errors.push('Excel file is empty');
    return { isValid: false, errors };
  }

  // Validate each row
  data.forEach((row, index) => {
    const rowNum = index + 2; // +2 because row 1 is header and array is 0-indexed

    // Check if month is present
    if (!row.month) {
      errors.push(`Row ${rowNum}: Month is required`);
    }

    // Check if month is valid
    if (row.month && !MONTHS.includes(row.month)) {
      errors.push(`Row ${rowNum}: Invalid month "${row.month}"`);
    }

    // Validate numeric fields
    PARAMETER_COLUMNS.slice(1).forEach(col => {
      const value = row[col.key];

      // Skip if empty (optional fields)
      if (value === '' || value === null || value === undefined) {
        return;
      }

      // Check if numeric
      if (isNaN(Number(value))) {
        errors.push(`Row ${rowNum}, ${col.label}: Must be a number`);
      }

      // Check if negative
      if (Number(value) < 0) {
        errors.push(`Row ${rowNum}, ${col.label}: Cannot be negative`);
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Export current dashboard data to Excel
 */
export function exportDataToExcel(
  data: any[],
  siteName: string,
  year: number
) {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Prepare data for export
  const exportData = data.map(row => {
    const exportRow: any = {};

    PARAMETER_COLUMNS.forEach(col => {
      exportRow[col.label] = row[col.key] || '';
    });

    return exportRow;
  });

  // Convert to worksheet
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Set column widths
  const colWidths = PARAMETER_COLUMNS.map(() => ({ wch: 20 }));
  ws['!cols'] = colWidths;

  // Add worksheet
  XLSX.utils.book_append_sheet(wb, ws, 'Safety Metrics');

  // Generate file name
  const fileName = `Safety_Metrics_${siteName.replace(/\s+/g, '_')}_${year}.xlsx`;

  // Download
  XLSX.writeFile(wb, fileName);
}
