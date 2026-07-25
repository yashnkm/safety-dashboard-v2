import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// A purpose-built, formal safety report (real vector text, selectable) — not
// a screenshot. Conservative navy/grey-on-white with status colour only.

export interface ReportParam {
  title: string;
  target: number;
  actual: number;
  score: number; // 0-100 achievement
  weight: number;
  unit?: string;
  isIncident?: boolean;
}

export interface ReportOptions {
  companyName: string;
  siteLabel: string; // e.g. "DEMO (DEMO)" or "All Sites — DEMO"
  period: string; // e.g. "December 2025"
  generatedAt: string;
  logo?: { dataUrl: string; width: number; height: number } | null;
  totalScore: number;
  maxScore: number;
  rating: 'LOW' | 'MEDIUM' | 'HIGH';
  completeness?: { reported: number; total: number; adjustedPercentage: number | null } | null;
  // Category key -> ordered params, in display order.
  categories: { key: string; label: string; params: ReportParam[] }[];
}

// ---- palette -------------------------------------------------------------
const NAVY: [number, number, number] = [31, 58, 95]; // #1f3a5f
const INK: [number, number, number] = [40, 40, 40];
const GREY: [number, number, number] = [110, 110, 110];
const LIGHT: [number, number, number] = [225, 228, 232];
const GREEN: [number, number, number] = [22, 163, 74];
const AMBER: [number, number, number] = [202, 138, 4];
const RED: [number, number, number] = [220, 38, 38];
const MUTED: [number, number, number] = [150, 150, 150];

const ratingColor = (r: string): [number, number, number] =>
  r === 'HIGH' ? GREEN : r === 'MEDIUM' ? AMBER : RED;

function isNotReported(p: ReportParam) {
  return !p.isIncident && p.target === 0 && p.actual === 0;
}
function statusOf(p: ReportParam): string {
  if (isNotReported(p)) return 'Not Reported';
  if (p.score >= 90) return 'Excellent';
  if (p.score >= 70) return 'Good';
  return 'Needs Attention';
}
function statusColor(s: string): [number, number, number] {
  return s === 'Excellent' ? GREEN : s === 'Good' ? AMBER : s === 'Needs Attention' ? RED : MUTED;
}
const num = (n: number) => n.toLocaleString();

// ---- shared header / footer ---------------------------------------------
function decorate(doc: jsPDF, opts: ReportOptions, pageW: number, pageH: number, marginX: number) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    if (i > 1) {
      // running header (skip the cover)
      doc.setFontSize(8);
      doc.setTextColor(...GREY);
      doc.setFont('helvetica', 'normal');
      doc.text(`Safety Performance Report — ${opts.siteLabel}`, marginX, 26);
      doc.text(opts.period, pageW - marginX, 26, { align: 'right' });
      doc.setDrawColor(...LIGHT);
      doc.line(marginX, 32, pageW - marginX, 32);
    }
    // footer
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('Protecther Safety Dashboard', marginX, pageH - 18);
    doc.text(`Page ${i} of ${pageCount}`, pageW - marginX, pageH - 18, { align: 'right' });
  }
}

// ---- cover ---------------------------------------------------------------
function drawCover(doc: jsPDF, opts: ReportOptions, pageW: number, marginX: number) {
  let y = 70;

  if (opts.logo) {
    const h = 40;
    const w = h * (opts.logo.width / opts.logo.height);
    doc.addImage(opts.logo.dataUrl, 'PNG', marginX, y, w, h);
    y += h + 14;
  }

  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(opts.companyName.toUpperCase(), marginX, y);
  y += 40;

  doc.setFontSize(30);
  doc.text('Safety Performance Report', marginX, y, { maxWidth: pageW - marginX * 2 });
  y += 34;

  doc.setDrawColor(...NAVY);
  doc.setLineWidth(2);
  doc.line(marginX, y, marginX + 90, y);
  doc.setLineWidth(0.4);
  y += 30;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(`Site:  ${opts.siteLabel}`, marginX, y);
  y += 20;
  doc.text(`Reporting Period:  ${opts.period}`, marginX, y);
  y += 50;

  // Overall score block
  const boxY = y;
  doc.setDrawColor(...LIGHT);
  doc.setFillColor(248, 249, 251);
  doc.roundedRect(marginX, boxY, pageW - marginX * 2, 120, 4, 4, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...GREY);
  doc.text('OVERALL KPI ACHIEVEMENT', marginX + 24, boxY + 30);

  const rc = ratingColor(opts.rating);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(46);
  doc.setTextColor(...rc);
  const scoreStr = opts.totalScore.toFixed(1);
  const scoreW = doc.getTextWidth(scoreStr); // measured at 46pt, before shrinking
  doc.text(scoreStr, marginX + 24, boxY + 78);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.setTextColor(...GREY);
  doc.text(`/ ${opts.maxScore}`, marginX + 24 + scoreW + 12, boxY + 78);

  doc.setFontSize(13);
  doc.setTextColor(...rc);
  doc.text(`Rating: ${opts.rating}`, marginX + 24, boxY + 100);

  // score bar
  const barX = marginX + 250;
  const barW = pageW - marginX - 24 - barX;
  const barY = boxY + 66;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(barX, barY, barW, 12, 2, 2, 'F');
  const pct = Math.max(0, Math.min(100, (opts.totalScore / opts.maxScore) * 100));
  doc.setFillColor(...rc);
  doc.roundedRect(barX, barY, (barW * pct) / 100, 12, 2, 2, 'F');

  if (opts.completeness) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...GREY);
    doc.text(
      `${opts.completeness.reported} of ${opts.completeness.total} parameters reported this period.`,
      marginX + 250,
      boxY + 100
    );
  }

  // generated
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(`Generated ${opts.generatedAt}`, marginX, boxY + 160);
}

// ---- executive summary ---------------------------------------------------
function drawExecSummary(doc: jsPDF, opts: ReportOptions, pageW: number, marginX: number) {
  doc.addPage();
  let y = 60;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text('Executive Summary', marginX, y);
  y += 24;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  const reported = opts.completeness?.reported ?? 0;
  const total = opts.completeness?.total ?? 0;
  const narrative =
    `For ${opts.siteLabel} during ${opts.period}, the overall safety KPI achievement was ` +
    `${opts.totalScore.toFixed(1)} out of ${opts.maxScore}, rated ${opts.rating}. ` +
    (total ? `${reported} of ${total} parameters were reported for the period` : '') +
    (opts.completeness?.adjustedPercentage != null
      ? `; scored only against reported parameters, achievement was ${opts.completeness.adjustedPercentage.toFixed(1)}%.`
      : '.');
  const lines = doc.splitTextToSize(narrative, pageW - marginX * 2);
  doc.text(lines, marginX, y);
  y += lines.length * 14 + 12;

  // Category performance table
  const catRows = opts.categories.map((c) => {
    const reportedParams = c.params.filter((p) => !isNotReported(p));
    const maxPts = c.params.reduce((s, p) => s + p.weight, 0);
    const earned = c.params.reduce((s, p) => s + (p.score * p.weight) / 100, 0);
    const pctEarned = maxPts > 0 ? (earned / maxPts) * 100 : 0;
    return [c.label, `${reportedParams.length}/${c.params.length}`, `${earned.toFixed(1)} / ${maxPts}`, `${pctEarned.toFixed(0)}%`];
  });
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [['Category', 'Reported', 'Points Earned', 'Achievement']],
    body: catRows,
    theme: 'grid',
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontSize: 9.5, halign: 'left' },
    bodyStyles: { fontSize: 9.5, textColor: INK },
    alternateRowStyles: { fillColor: [248, 249, 251] },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
  });
  // @ts-expect-error plugin runtime prop
  y = doc.lastAutoTable.finalY + 26;

  // Highlights: needs attention & top performers
  const allParams = opts.categories.flatMap((c) => c.params);
  const needs = allParams.filter((p) => !isNotReported(p) && p.score < 70).sort((a, b) => a.score - b.score);
  const top = allParams.filter((p) => !isNotReported(p) && p.score >= 90);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...RED);
  doc.text('Areas Needing Attention', marginX, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  if (needs.length === 0) {
    doc.text('None — every reported parameter met at least 70% achievement.', marginX, y);
    y += 16;
  } else {
    for (const p of needs.slice(0, 8)) {
      doc.setTextColor(...RED);
      doc.text('•', marginX, y);
      doc.setTextColor(...INK);
      doc.text(`${p.title} — ${p.score.toFixed(1)}% (actual ${num(p.actual)}${p.unit ? ' ' + p.unit : ''} vs target ${num(p.target)})`, marginX + 12, y);
      y += 15;
    }
  }
  y += 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...GREEN);
  doc.text('Top Performers', marginX, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  if (top.length === 0) {
    doc.text('No parameters reached the Excellent threshold (90%+) this period.', marginX, y);
  } else {
    const names = top.map((p) => p.title).slice(0, 12).join(', ');
    const tl = doc.splitTextToSize(names + (top.length > 12 ? ', …' : ''), pageW - marginX * 2 - 12);
    doc.setTextColor(...GREEN);
    doc.text('•', marginX, y);
    doc.setTextColor(...INK);
    doc.text(tl, marginX + 12, y);
  }
}

// ---- detail tables (Full only) ------------------------------------------
function drawDetail(doc: jsPDF, opts: ReportOptions, marginX: number) {
  doc.addPage();
  let y = 60;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text('Parameter Detail', marginX, y);
  y += 22;

  for (const cat of opts.categories) {
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [[cat.label, 'Target', 'Actual', 'Achievement', 'Points', 'Status']],
      body: cat.params.map((p) => {
        const s = statusOf(p);
        return [
          p.title,
          `${num(p.target)}${p.unit ? ' ' + p.unit : ''}`,
          `${num(p.actual)}${p.unit ? ' ' + p.unit : ''}`,
          isNotReported(p) ? '—' : `${p.score.toFixed(1)}%`,
          `${((p.score * p.weight) / 100).toFixed(2)} / ${p.weight}`,
          s,
        ];
      }),
      theme: 'grid',
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontSize: 9, halign: 'left' },
      bodyStyles: { fontSize: 8.5, textColor: INK },
      alternateRowStyles: { fillColor: [248, 249, 251] },
      columnStyles: {
        0: { cellWidth: 150 },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'center', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          data.cell.styles.textColor = statusColor(data.cell.raw as string);
        }
      },
    });
    // @ts-expect-error plugin runtime prop
    y = doc.lastAutoTable.finalY + 18;
  }
}

/**
 * Build and download the report. `mode` = 'summary' (cover + exec summary)
 * or 'full' (adds per-category parameter tables).
 */
export function exportSafetyReport(opts: ReportOptions, mode: 'summary' | 'full', fileName: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 48;

  drawCover(doc, opts, pageW, marginX);
  drawExecSummary(doc, opts, pageW, marginX);
  if (mode === 'full') drawDetail(doc, opts, marginX);

  decorate(doc, opts, pageW, pageH, marginX);
  doc.save(fileName);
}
