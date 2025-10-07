import { api } from './api.ts';

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

interface Site {
  id: string;
  siteName: string;
  siteCode: string;
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
