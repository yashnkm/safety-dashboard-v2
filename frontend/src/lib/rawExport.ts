// Raw parameter-level CSV export, so the underlying Target/Actual numbers and
// the derived Achievement/Points/Status can be independently verified outside
// the app (opens directly in Excel).

export interface RawExportParam {
  title: string;
  target: number;
  actual: number;
  score: number; // 0-100 achievement
  weight: number;
  unit?: string;
  isIncident?: boolean;
}

export interface RawExportOptions {
  siteLabel: string;
  period: string;
  generatedAt: string;
  categories: { key: string; label: string; params: RawExportParam[] }[];
}

const isNotReported = (p: RawExportParam) => !p.isIncident && p.target === 0 && p.actual === 0;

function statusOf(p: RawExportParam): string {
  if (isNotReported(p)) return 'Not Reported';
  if (p.score >= 90) return 'Excellent';
  if (p.score >= 70) return 'Good';
  return 'Needs Attention';
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportRawParameterCsv(opts: RawExportOptions, fileName: string): void {
  const rows: string[] = [];
  rows.push(['Site', opts.siteLabel].map(csvCell).join(','));
  rows.push(['Period', opts.period].map(csvCell).join(','));
  rows.push(['Generated', opts.generatedAt].map(csvCell).join(','));
  rows.push('');
  rows.push(
    ['Category', 'Parameter', 'Target', 'Actual', 'Unit', 'Achievement %', 'Weight (max pts)', 'Points Earned', 'Status']
      .map(csvCell)
      .join(',')
  );

  for (const cat of opts.categories) {
    for (const p of cat.params) {
      const nr = isNotReported(p);
      rows.push(
        [
          cat.label,
          p.title,
          p.target,
          p.actual,
          p.unit || '',
          nr ? '' : Number(p.score).toFixed(1),
          p.weight,
          ((Number(p.score) * p.weight) / 100).toFixed(2),
          statusOf(p),
        ]
          .map(csvCell)
          .join(',')
      );
    }
  }

  // Leading BOM + CRLF so Excel opens the UTF-8 file cleanly.
  const blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
