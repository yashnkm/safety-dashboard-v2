import jsPDF from 'jspdf';
// html2canvas-pro is a maintained fork that supports modern CSS color
// functions (oklch/lab/lch). Plain html2canvas 1.4.1 throws on the oklch()
// colors that Tailwind/shadcn emit. Drop-in same API.
import html2canvas from 'html2canvas-pro';

/**
 * Screenshot-style PDF export: rasterizes a DOM node exactly as it looks on
 * screen (gauge, cards, charts). Pages are cut only in the gaps *between*
 * cards, never through one — so a card never straddles a page break, and
 * section headers (which sit in those gaps) flow onto the same page as the
 * cards that follow them.
 *
 * Elements marked `data-html2canvas-ignore` (e.g. action buttons) are
 * skipped natively by html2canvas.
 *
 * Trade-off vs. a rebuilt-in-jsPDF report: pixel-perfect to the dashboard,
 * but the text isn't selectable.
 */
export async function exportDashboardVisualPdf(element: HTMLElement, fileName: string): Promise<void> {
  const scale = 2; // crisper text/lines than 1x

  // Measure the "atomic" blocks (cards, notices, charts) BEFORE capture, in
  // canvas pixels relative to the element's top. Every Card carries the
  // `rounded-lg` class, which is what we key on.
  const elemTop = element.getBoundingClientRect().top;
  const blockEls = element.querySelectorAll<HTMLElement>('[class*="rounded-lg"]');
  const intervals: Array<[number, number]> = [];
  blockEls.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height === 0) return;
    intervals.push([(r.top - elemTop) * scale, (r.bottom - elemTop) * scale]);
  });
  // Merge overlapping/adjacent block intervals (e.g. a row of 3 cards) so the
  // safe cut points are the *bottoms* of whole rows/groups.
  intervals.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const iv of intervals) {
    const last = merged[merged.length - 1];
    if (last && iv[0] <= last[1] + 1) {
      last[1] = Math.max(last[1], iv[1]);
    } else {
      merged.push([iv[0], iv[1]]);
    }
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

  // Document margins so the content never runs flush to the paper edge
  // (which reads as "cut off"). Content is inset into this box.
  const marginX = 26;
  const marginTop = 28;
  const marginBottom = 32; // a little extra room for the page-number footer
  const contentWidth = pageWidth - marginX * 2;
  const usableHeight = pageHeight - marginTop - marginBottom;

  const pxToPt = contentWidth / canvas.width; // canvas px -> PDF points (inset width)
  const pageContentPx = usableHeight / pxToPt; // canvas px that fill one page's usable height

  // Safe cut points: the bottom of each merged group (cut right after a
  // complete row of cards), plus the very bottom of the canvas.
  const safeCuts = merged.map((m) => m[1]);
  safeCuts.push(canvas.height);

  let pageStart = 0;
  let firstPage = true;
  while (pageStart < canvas.height - 1) {
    const target = pageStart + pageContentPx;

    // Largest safe cut that fits in this page; if a single block is taller
    // than a page (shouldn't happen here), hard-cut to make progress.
    let cut = -1;
    for (const c of safeCuts) {
      if (c > pageStart && c <= target && c > cut) cut = c;
    }
    if (cut < 0) cut = Math.min(target, canvas.height);

    const sliceH = Math.round(cut - pageStart);

    // Copy this vertical slice onto its own canvas, then place it inside the
    // page margins.
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

  // "Page X of Y" footer, centered, on every page.
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 14, { align: 'center' });
  }

  pdf.save(fileName);
}
