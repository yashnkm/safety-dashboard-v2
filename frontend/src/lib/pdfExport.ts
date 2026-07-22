import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ParamRow {
  title: string;
  target: number;
  actual: number;
  score: number; // 0-100 achievement %
  weight: number; // max points out of 100
  unit?: string;
  isIncident?: boolean;
}

interface CategoryData {
  [category: string]: ParamRow[];
}

interface ExportOptions {
  siteLabel: string; // e.g. "DEMO (DEMO)"
  month: string;
  year: number;
  totalScore: number;
  maxScore: number;
  rating: 'LOW' | 'MEDIUM' | 'HIGH';
  displayData: CategoryData;
  isAmbiguousSource?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  operational: 'Operational Metrics',
  training: 'Training & Induction',
  compliance: 'Inspection & Compliance',
  documentation: 'Documentation',
  emergency: 'Emergency & Audit',
  incidents: 'Incident Reports',
  ppe: 'PPE Compliance',
  environment: 'Environment Metrics',
  health: 'Health & Hygiene',
};

const RATING_COLORS: Record<string, [number, number, number]> = {
  HIGH: [22, 163, 74], // green-600
  MEDIUM: [217, 119, 6], // amber-600
  LOW: [220, 38, 38], // red-600
};

function isNotReported(row: ParamRow): boolean {
  return !row.isIncident && row.target === 0 && row.actual === 0;
}

function statusLabel(row: ParamRow): string {
  if (isNotReported(row)) return 'Not Reported';
  if (row.score >= 90) return 'Excellent';
  if (row.score >= 70) return 'Good';
  return 'Needs Attention';
}

export function exportDashboardToPdf(options: ExportOptions) {
  const { siteLabel, month, year, totalScore, maxScore, rating, displayData, isAmbiguousSource } = options;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  let cursorY = 50;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Safety KPI Report', marginX, cursorY);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Generated ${new Date().toLocaleString()}`, pageWidth - marginX, cursorY, { align: 'right' });

  cursorY += 24;
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text(siteLabel, marginX, cursorY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${month} ${year}`, pageWidth - marginX, cursorY, { align: 'right' });

  if (isAmbiguousSource) {
    cursorY += 16;
    doc.setFontSize(9);
    doc.setTextColor(180, 100, 0);
    doc.text(
      'Note: other sites also have data for this period, not included in this report.',
      marginX,
      cursorY
    );
    doc.setTextColor(0);
  }

  cursorY += 20;
  doc.setDrawColor(220);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 24;

  // Summary box
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('KPI Achievement Score', marginX, cursorY);
  cursorY += 20;

  doc.setFontSize(20);
  const ratingColor = RATING_COLORS[rating] || [0, 0, 0];
  doc.setTextColor(...ratingColor);
  doc.text(`${totalScore.toFixed(1)} / ${maxScore}`, marginX, cursorY);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Rating: ${rating}`, marginX + 160, cursorY);
  doc.setTextColor(0);

  cursorY += 30;

  // Data completeness summary
  const allRows = Object.values(displayData).flat();
  const reportedCount = allRows.filter((r) => !isNotReported(r)).length;
  if (reportedCount < allRows.length) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      `${reportedCount} of ${allRows.length} parameters reported for this period.`,
      marginX,
      cursorY
    );
    doc.setTextColor(0);
    cursorY += 18;
  }

  cursorY += 8;

  // Per-category tables
  for (const [categoryKey, rows] of Object.entries(displayData)) {
    if (!rows || rows.length === 0) continue;

    const label = CATEGORY_LABELS[categoryKey] || categoryKey;

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      head: [[label, 'Target', 'Actual', 'Achievement', 'Points', 'Status']],
      body: rows.map((row) => [
        row.title,
        `${row.target.toLocaleString()}${row.unit ? ' ' + row.unit : ''}`,
        `${row.actual.toLocaleString()}${row.unit ? ' ' + row.unit : ''}`,
        isNotReported(row) ? '—' : `${row.score.toFixed(1)}%`,
        `${((row.score * row.weight) / 100).toFixed(2)} / ${row.weight}`,
        statusLabel(row),
      ]),
      headStyles: { fillColor: [37, 99, 235], fontSize: 9, halign: 'left' },
      bodyStyles: { fontSize: 8.5 },
      columnStyles: {
        0: { cellWidth: 170 },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const status = data.cell.raw as string;
          if (status === 'Needs Attention') data.cell.styles.textColor = [220, 38, 38];
          else if (status === 'Good') data.cell.styles.textColor = [217, 119, 6];
          else if (status === 'Excellent') data.cell.styles.textColor = [22, 163, 74];
          else data.cell.styles.textColor = [150, 150, 150];
        }
      },
    });

    // @ts-expect-error - lastAutoTable is attached by the plugin at runtime
    cursorY = doc.lastAutoTable.finalY + 20;
  }

  // Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Protecther Safety Dashboard — Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: 'center' }
    );
  }

  const fileName = `Safety-KPI-Report_${siteLabel.replace(/[^a-z0-9]/gi, '-')}_${month}-${year}.pdf`;
  doc.save(fileName);
}
