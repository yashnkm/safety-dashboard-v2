import jsPDF from 'jspdf';
// html2canvas-pro is a maintained fork that supports modern CSS color
// functions (oklch/lab/lch). Plain html2canvas 1.4.1 throws on the oklch()
// colors that Tailwind/shadcn emit. Drop-in same API.
import html2canvas from 'html2canvas-pro';

interface ReportHeader {
  siteLabel: string; // e.g. "DEMO (DEMO)"
  period: string; // e.g. "December 2025"
  generatedAt: string; // e.g. "24 Jul 2026, 4:30 PM"
}

// Capture at a fixed width so every exported report looks the same
// regardless of the user's screen size / window width.
const CAPTURE_WIDTH = 1200;

/**
 * Screenshot-style PDF export: rasterizes a DOM node exactly as it looks on
 * screen (gauge, cards, charts). To keep output consistent across devices,
 * the node is forced to a fixed width and its card grids to 3 columns for
 * the duration of the capture. Pages are cut only in the gaps *between*
 * cards, never through one, and every page carries a running header
 * (report / site / period / generated time) and a "Page X of Y" footer.
 *
 * Elements marked `data-html2canvas-ignore` (e.g. action buttons) are
 * skipped natively by html2canvas.
 */
export async function exportDashboardVisualPdf(
  element: HTMLElement,
  fileName: string,
  header: ReportHeader
): Promise<void> {
  const scale = 2; // crisper text/lines than 1x

  // --- Force a consistent capture layout regardless of screen size ---
  const prevElemCss = element.style.cssText;
  const grids = Array.from(element.querySelectorAll<HTMLElement>('[class*="lg:grid-cols-3"]'));
  const prevGridCols = grids.map((g) => g.style.gridTemplateColumns);

  element.style.width = `${CAPTURE_WIDTH}px`;
  element.style.minWidth = `${CAPTURE_WIDTH}px`;
  element.style.maxWidth = 'none';
  element.style.flexShrink = '0';
  grids.forEach((g) => {
    g.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
  });

  // Let recharts' ResponsiveContainer re-measure to the new widths.
  await new Promise((res) => setTimeout(res, 350));

  try {
    // Measure the "atomic" blocks (cards, notices, charts) at the fixed
    // layout, in canvas pixels relative to the element's top. Every Card
    // carries `rounded-lg`, which is what we key on.
    const elemTop = element.getBoundingClientRect().top;
    const intervals: Array<[number, number]> = [];
    element.querySelectorAll<HTMLElement>('[class*="rounded-lg"]').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.height === 0) return;
      intervals.push([(r.top - elemTop) * scale, (r.bottom - elemTop) * scale]);
    });
    // Merge overlapping/adjacent block intervals (e.g. a row of 3 cards) so
    // the safe cut points are the bottoms of whole rows/groups.
    intervals.sort((a, b) => a[0] - b[0]);
    const merged: Array<[number, number]> = [];
    for (const iv of intervals) {
      const last = merged[merged.length - 1];
      if (last && iv[0] <= last[1] + 1) last[1] = Math.max(last[1], iv[1]);
      else merged.push([iv[0], iv[1]]);
    }

    const canvas = await html2canvas(element, {
      scale,
      backgroundColor: '#ffffff',
      useCORS: true, // allow the company logo (served cross-origin) to render
      logging: false,
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Margins: extra top room for the running header, bottom room for the
    // page-number footer.
    const marginX = 26;
    const marginTop = 40;
    const marginBottom = 30;
    const contentWidth = pageWidth - marginX * 2;
    const usableHeight = pageHeight - marginTop - marginBottom;

    const pxToPt = contentWidth / canvas.width;
    const pageContentPx = usableHeight / pxToPt;

    // Safe cut points: the bottom of each merged group, plus the very bottom.
    const safeCuts = merged.map((m) => m[1]);
    safeCuts.push(canvas.height);

    let pageStart = 0;
    let firstPage = true;
    while (pageStart < canvas.height - 1) {
      const target = pageStart + pageContentPx;
      let cut = -1;
      for (const c of safeCuts) {
        if (c > pageStart && c <= target && c > cut) cut = c;
      }
      if (cut < 0) cut = Math.min(target, canvas.height);

      const sliceH = Math.round(cut - pageStart);

      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = sliceH;
      const ctx = slice.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, pageStart, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

      if (!firstPage) pdf.addPage();
      pdf.addImage(slice.toDataURL('image/jpeg', 0.95), 'JPEG', marginX, marginTop, contentWidth, sliceH * pxToPt);
      firstPage = false;

      pageStart = cut;
    }

    // Running header + footer on every page.
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(120);
      pdf.text(`Protecther Safety Report  ·  ${header.siteLabel}  ·  ${header.period}`, marginX, 22);
      pdf.text(`Generated ${header.generatedAt}`, pageWidth - marginX, 22, { align: 'right' });
      pdf.setDrawColor(225);
      pdf.line(marginX, 28, pageWidth - marginX, 28);
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 14, { align: 'center' });
    }

    pdf.save(fileName);
  } finally {
    // Restore the live layout no matter what.
    element.style.cssText = prevElemCss;
    grids.forEach((g, i) => {
      g.style.gridTemplateColumns = prevGridCols[i];
    });
  }
}
