import { api } from './api.ts';
import { periodsToQueryParam } from '../lib/periodUtils';

interface KPIData {
  manDays: number;
  safeWorkHours: number;
  lostTimeInjuries: number;
  nearMissReports: number;
}

interface MetricsFilters {
  siteId?: string;
  month?: string;
  year?: number;
}

export interface Site {
  id: string;
  siteName: string;
  siteCode: string;
  companyId?: string;
  company?: {
    companyName: string;
    logoUrl?: string | null;
  };
}

export const dashboardService = {
  /**
   * Get KPI summary
   */
  getKPI: async (filters?: MetricsFilters): Promise<KPIData> => {
    const params = new URLSearchParams();
    if (filters?.siteId) params.append('siteId', filters.siteId);
    if (filters?.month) params.append('month', filters.month);
    if (filters?.year) params.append('year', filters.year.toString());

    const response = await api.get(`/dashboard/kpi?${params.toString()}`);
    return response.data.data;
  },

  /**
   * Get detailed metrics
   */
  getMetrics: async (filters?: MetricsFilters) => {
    const params = new URLSearchParams();
    if (filters?.siteId) params.append('siteId', filters.siteId);
    if (filters?.month) params.append('month', filters.month);
    if (filters?.year) params.append('year', filters.year.toString());

    const response = await api.get(`/dashboard/metrics?${params.toString()}`);
    return response.data.data;
  },

  /**
   * Real "All Sites" aggregation - combines every site's data for the
   * period into one company-wide scorecard. companyId is required for
   * SUPER_ADMIN (they must pick a company first); ignored for everyone
   * else, who are always scoped to their own company server-side.
   */
  getAggregatedMetrics: async (filters: { companyId?: string; month: string; year: number }) => {
    const params = new URLSearchParams();
    if (filters.companyId) params.append('companyId', filters.companyId);
    params.append('month', filters.month);
    params.append('year', filters.year.toString());

    const response = await api.get(`/dashboard/metrics/aggregate?${params.toString()}`);
    return response.data.data;
  },

  /**
   * Combines metrics across an arbitrary set of (month, year) periods -
   * powers Quarterly/Half-Yearly/Annual/Custom dashboard views. siteId
   * omitted or 'all' also combines across every site in the company.
   */
  getCombinedMetrics: async (filters: {
    companyId?: string;
    siteId?: string;
    periods: { month: string; year: number }[];
  }) => {
    const params = new URLSearchParams();
    if (filters.companyId) params.append('companyId', filters.companyId);
    if (filters.siteId) params.append('siteId', filters.siteId);
    params.append('periods', periodsToQueryParam(filters.periods));

    const response = await api.get(`/dashboard/metrics/combined?${params.toString()}`);
    return response.data.data;
  },

  /**
   * Get specific metric by site and period
   */
  getMetricBySiteAndPeriod: async (siteId: string, year: number, month: string) => {
    const response = await api.get(`/dashboard/metrics/${siteId}/${year}/${month}`);
    return response.data.data;
  },

  /**
   * Create or update metrics
   */
  upsertMetrics: async (data: any) => {
    const response = await api.post('/dashboard/metrics', data);
    return response.data.data;
  },

  /**
   * Get all sites
   */
  getSites: async () => {
    const response = await api.get('/dashboard/sites');
    return response.data;
  },

  /**
   * Bulk import metrics from Excel
   */
  bulkImportMetrics: async (data: { siteId: string; year: number; metricsData: any[] }) => {
    const response = await api.post('/dashboard/metrics/bulk-import', data);
    return response.data;
  },
};
