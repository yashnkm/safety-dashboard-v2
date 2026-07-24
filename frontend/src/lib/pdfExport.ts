import jsPDF from 'jspdf';
// html2canvas-pro is a maintained fork that supports modern CSS color
// functions (oklch/lab/lch). Plain html2canvas 1.4.1 throws on the oklch()
// colors that Tailwind/shadcn emit. Drop-in same API.
import html2canvas from 'html2canvas-pro';

/**
 * Screenshot-style PDF export: rasterizes a DOM node exactly as it looks on
 * screen (gauge, cards, charts) and lays it across as many A4 pages as
 * needed. Elements marked `data-html2canvas-ignore` (e.g. action buttons)
 * are skipped natively by html2canvas.
 *
 * Trade-off vs. the old table export: pixel-perfect to the dashboard, but
 * text isn't selectable and a card can straddle a page break.
 */
export async function exportDashboardVisualPdf(element: HTMLElement, fileName: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2, // crisper text/lines than 1x
    backgroundColor: '#ffffff',
    useCORS: true, // allow the company logo (served cross-origin) to render
    logging: false,
    // No windowWidth override: it makes recharts' ResponsiveContainer
    // re-measure to a wider parent during capture, so the trend/bar charts
    // render wider than their cards and get clipped at the page's right
    // edge. Capturing at the element's natural width matches the screen.
  });

  // JPEG keeps a long, many-card capture to a sane file size vs. PNG.
  const imgData = canvas.toDataURL('image/jpeg', 0.95);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Fit the capture to full page width; height scales proportionally.
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Place the single tall image and shift it up one page-height at a time,
  // adding pages until the whole thing has been laid down.
  let heightLeft = imgHeight;
  let position = 0;
  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(fileName);
}
