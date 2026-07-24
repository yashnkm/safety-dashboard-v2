import { MONTHS } from './excelTemplate';

export type PeriodType = 'monthly' | 'quarterly' | 'halfyearly' | 'annual' | 'custom' | 'daterange';
export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type Half = 'H1' | 'H2';

export interface PeriodSelection {
  type: PeriodType;
  year: number;
  month?: string; // monthly
  quarter?: Quarter; // quarterly
  half?: Half; // halfyearly
  months?: string[]; // custom
  // daterange - an inclusive span that may cross years, e.g. a whole
  // multi-year project from its start month to its end month.
  startMonth?: string;
  startYear?: number;
  endMonth?: string;
  endYear?: number;
}

/**
 * Every month from (startMonth, startYear) to (endMonth, endYear) inclusive,
 * in chronological order, crossing year boundaries as needed. Returns [] for
 * an incomplete or backwards range (start after end).
 */
export function expandDateRange(
  startMonth: string | undefined,
  startYear: number | undefined,
  endMonth: string | undefined,
  endYear: number | undefined
): { month: string; year: number }[] {
  if (!startMonth || !startYear || !endMonth || !endYear) return [];
  const startIdx = MONTHS.indexOf(startMonth);
  const endIdx = MONTHS.indexOf(endMonth);
  if (startIdx < 0 || endIdx < 0) return [];

  // Collapse (year, monthIndex) to a single comparable number of months.
  const startAbs = startYear * 12 + startIdx;
  const endAbs = endYear * 12 + endIdx;
  if (endAbs < startAbs) return [];

  const out: { month: string; year: number }[] = [];
  for (let abs = startAbs; abs <= endAbs; abs++) {
    out.push({ month: MONTHS[abs % 12], year: Math.floor(abs / 12) });
  }
  return out;
}

export const QUARTER_MONTHS: Record<Quarter, string[]> = {
  Q1: MONTHS.slice(0, 3),
  Q2: MONTHS.slice(3, 6),
  Q3: MONTHS.slice(6, 9),
  Q4: MONTHS.slice(9, 12),
};

export const HALF_MONTHS: Record<Half, string[]> = {
  H1: MONTHS.slice(0, 6),
  H2: MONTHS.slice(6, 12),
};

/**
 * Expands a period selection into the concrete list of (month, year) pairs
 * the backend should combine. All the "what does Q1 mean" logic lives here
 * so the backend endpoint can stay generic - just given an explicit list.
 */
export function resolvePeriods(sel: PeriodSelection): { month: string; year: number }[] {
  // Date range is the one type that spans years, so it builds its own
  // (month, year) list rather than pinning every month to a single year.
  if (sel.type === 'daterange') {
    return expandDateRange(sel.startMonth, sel.startYear, sel.endMonth, sel.endYear);
  }

  let months: string[];
  switch (sel.type) {
    case 'monthly':
      months = sel.month ? [sel.month] : [];
      break;
    case 'quarterly':
      months = sel.quarter ? QUARTER_MONTHS[sel.quarter] : [];
      break;
    case 'halfyearly':
      months = sel.half ? HALF_MONTHS[sel.half] : [];
      break;
    case 'annual':
      months = MONTHS;
      break;
    case 'custom':
      months = sel.months ?? [];
      break;
    default:
      months = [];
  }
  return months.map((month) => ({ month, year: sel.year }));
}

export function periodsToQueryParam(periods: { month: string; year: number }[]): string {
  return periods.map((p) => `${p.month}-${p.year}`).join(',');
}

/** Human-readable label for the currently selected period, e.g. "Q1 2026". */
export function periodLabel(sel: PeriodSelection): string {
  switch (sel.type) {
    case 'monthly':
      return `${sel.month} ${sel.year}`;
    case 'quarterly':
      return `${sel.quarter} ${sel.year}`;
    case 'halfyearly':
      return `${sel.half} ${sel.year}`;
    case 'annual':
      return `${sel.year} (Annual)`;
    case 'custom':
      return `${(sel.months ?? []).map((m) => m.slice(0, 3)).join(', ')} ${sel.year}`;
    case 'daterange':
      return `${(sel.startMonth ?? '').slice(0, 3)} ${sel.startYear ?? ''} – ${(sel.endMonth ?? '').slice(0, 3)} ${sel.endYear ?? ''}`;
  }
}
