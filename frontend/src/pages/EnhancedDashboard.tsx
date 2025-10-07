import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout.tsx';
import AppSidebar from '@/components/layout/AppSidebar.tsx';
import GaugeChart from '@/components/dashboard/GaugeChart.tsx';
import MonthlyTrendChart from '@/components/dashboard/MonthlyTrendChart.tsx';
import ParametersBarChart from '@/components/dashboard/ParametersBarChart.tsx';
import { Button } from '@/components/ui/button.tsx';
import { dashboardService } from '@/services/dashboard.service.ts';
import { Upload } from 'lucide-react';
import { useAuthStore } from '@/store/authStore.ts';

type CategoryKey = 'operational' | 'training' | 'compliance' | 'documentation' | 'emergency' | 'incidents';

export default function EnhancedDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  // Filter state
  const currentDate = new Date();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const [selectedSite, setSelectedSite] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(monthNames[currentDate.getMonth()]);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Category visibility state
  const [enabledCategories, setEnabledCategories] = useState<Record<CategoryKey, boolean>>({
    operational: true,
    training: true,
    compliance: true,
    documentation: true,
    emergency: true,
    incidents: true,
  });

  // Check for lastImport from localStorage (after Excel import)
  useEffect(() => {
    const lastImportStr = localStorage.getItem('lastImport');
    if (lastImportStr) {
      try {
        const lastImport = JSON.parse(lastImportStr);
        if (lastImport.siteId) setSelectedSite(lastImport.siteId);
        if (lastImport.month) setSelectedMonth(lastImport.month);
        if (lastImport.year) setSelectedYear(lastImport.year);
        // Clear the flag after using it
        localStorage.removeItem('lastImport');
      } catch (e) {
        console.error('Failed to parse lastImport', e);
      }
    }
  }, []);

  // Fetch sites
  const { data: sitesResponse, isLoading: sitesLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: dashboardService.getSites,
  });

  const sites = sitesResponse?.data || [];

  // Fetch metrics data
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['metrics', selectedSite, selectedMonth, selectedYear],
    queryFn: () =>
      dashboardService.getMetrics({
        siteId: selectedSite !== 'all' ? selectedSite : undefined,
        month: selectedMonth,
        year: selectedYear,
      }),
    enabled: !!selectedMonth && !!selectedYear,
  });

  // Fetch yearly trend data (all months for the selected year)
  const { data: yearlyTrendData, isLoading: trendLoading } = useQuery({
    queryKey: ['yearlyTrend', selectedSite, selectedYear],
    queryFn: async () => {
      const promises = monthNames.map((month) =>
        dashboardService.getMetrics({
          siteId: selectedSite !== 'all' ? selectedSite : undefined,
          month: month,
          year: selectedYear,
        })
      );
      const results = await Promise.all(promises);
      return results.map((data, index) => ({
        month: monthNames[index].substring(0, 3), // Jan, Feb, etc.
        score: data && data.length > 0 ? Number(data[0].percentage) || 0 : 0,
        target: 100,
      }));
    },
    enabled: !!selectedYear,
  });

  const handleCategoryToggle = (category: string) => {
    setEnabledCategories((prev) => ({
      ...prev,
      [category]: !prev[category as CategoryKey],
    }));
  };

  // Process bar chart data from all 18 parameters
  const getBarChartData = () => {
    if (!metricsData || metricsData.length === 0) return [];

    const metric = metricsData[0];

    const calculatePercentage = (actual: number, target: number) => {
      if (target === 0) return 0;
      return (actual / target) * 100;
    };

    return [
      { name: 'Man Days', percentage: calculatePercentage(metric.manDaysActual || 0, metric.manDaysTarget || 0) },
      { name: 'Safe Hours', percentage: calculatePercentage(metric.safeWorkHoursActual || 0, metric.safeWorkHoursTarget || 0) },
      { name: 'Safety Induction', percentage: calculatePercentage(metric.safetyInductionActual || 0, metric.safetyInductionTarget || 0) },
      { name: 'Toolbox Talk', percentage: calculatePercentage(metric.toolBoxTalkActual || 0, metric.toolBoxTalkTarget || 0) },
      { name: 'Job Training', percentage: calculatePercentage(metric.jobSpecificTrainingActual || 0, metric.jobSpecificTrainingTarget || 0) },
      { name: 'Inspections', percentage: calculatePercentage(metric.formalSafetyInspectionActual || 0, metric.formalSafetyInspectionTarget || 0) },
      { name: 'Non-Comp Raised', percentage: calculatePercentage(metric.nonComplianceRaisedActual || 0, metric.nonComplianceRaisedTarget || 0) },
      { name: 'Non-Comp Close', percentage: calculatePercentage(metric.nonComplianceCloseActual || 0, metric.nonComplianceCloseTarget || 0) },
      { name: 'Obs Raised', percentage: calculatePercentage(metric.safetyObservationRaisedActual || 0, metric.safetyObservationRaisedTarget || 0) },
      { name: 'Obs Close', percentage: calculatePercentage(metric.safetyObservationCloseActual || 0, metric.safetyObservationCloseTarget || 0) },
      { name: 'Work Permits', percentage: calculatePercentage(metric.workPermitIssuedActual || 0, metric.workPermitIssuedTarget || 0) },
      { name: 'SWMS', percentage: calculatePercentage(metric.safeWorkMethodStatementActual || 0, metric.safeWorkMethodStatementTarget || 0) },
      { name: 'Mock Drills', percentage: calculatePercentage(metric.emergencyMockDrillsActual || 0, metric.emergencyMockDrillsTarget || 0) },
      { name: 'Internal Audit', percentage: calculatePercentage(metric.internalAuditActual || 0, metric.internalAuditTarget || 0) },
      { name: 'Near Miss', percentage: calculatePercentage(metric.nearMissReportActual || 0, metric.nearMissReportTarget || 0) },
      { name: 'First Aid', percentage: calculatePercentage(metric.firstAidInjuryActual || 0, metric.firstAidInjuryTarget || 0) },
      { name: 'Medical Treat', percentage: calculatePercentage(metric.medicalTreatmentInjuryActual || 0, metric.medicalTreatmentInjuryTarget || 0) },
      { name: 'Lost Time', percentage: calculatePercentage(metric.lostTimeInjuryActual || 0, metric.lostTimeInjuryTarget || 0) },
    ];
  };

  // Calculate metrics
  const calculateMetrics = () => {
    if (!metricsData || metricsData.length === 0) {
      return {
        totalScore: 0,
        maxScore: 100,
        progress: 0,
        gap: 100,
        rating: 'LOW' as const
      };
    }

    const metric = metricsData[0];
    const totalScore = Number(metric.totalScore) || 0;
    const maxScore = Number(metric.maxScore) || 100;
    const progress = (totalScore / maxScore) * 100;

    return {
      totalScore,
      maxScore,
      progress,
      gap: maxScore - totalScore,
      rating: (metric.rating || 'LOW') as 'LOW' | 'MEDIUM' | 'HIGH'
    };
  };

  const metrics = calculateMetrics();
  const barChartData = getBarChartData();

  return (
    <DashboardLayout
      sidebar={
        <AppSidebar
          sites={sites}
          selectedSite={selectedSite}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onSiteChange={setSelectedSite}
          onMonthChange={setSelectedMonth}
          onYearChange={setSelectedYear}
          enabledCategories={enabledCategories}
          onCategoryToggle={handleCategoryToggle}
          loading={sitesLoading}
        />
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">EHS KPI Analysis</h1>
            <p className="text-gray-600 mt-1">Environment, Health & Safety Key Performance Indicators</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Reporting Period</p>
              <p className="text-lg font-semibold text-gray-900">{selectedMonth} {selectedYear}</p>
            </div>
            <Button onClick={() => navigate('/import')} className="gap-2">
              <Upload className="w-4 h-4" />
              Import Data
            </Button>
          </div>
        </div>

        {/* Color indicator bar */}
        <div className="h-2 w-full rounded-full bg-gradient-to-r from-green-500 via-yellow-400 to-red-500" />

        {/* Loading State */}
        {metricsLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading dashboard data...</p>
          </div>
        )}

        {/* No Data Message */}
        {!metricsLoading && (!metricsData || metricsData.length === 0) && (
          <div className="text-center py-12">
            <p className="text-lg font-semibold text-muted-foreground mb-2">No Data Available</p>
            <p className="text-sm text-muted-foreground">
              No safety metrics found for the selected period.
            </p>
            {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
              <Button onClick={() => navigate('/import')} variant="outline" className="mt-4 gap-2">
                <Upload className="w-4 h-4" />
                Import Data from Excel
              </Button>
            )}
          </div>
        )}

        {/* Dashboard Content */}
        {!metricsLoading && metricsData && metricsData.length > 0 && (
          <>
            {/* Top Row: Gauge + Monthly Trend Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Gauge Chart */}
              <div className="lg:col-span-1">
                <GaugeChart
                  value={metrics.totalScore}
                  max={metrics.maxScore}
                  title="KPI Achievement Score"
                  subtitle={`${selectedMonth} Performance`}
                />
              </div>

              {/* Monthly Trend Chart */}
              <div className="lg:col-span-2">
                {trendLoading ? (
                  <div className="h-full flex items-center justify-center border rounded-lg bg-white">
                    <p className="text-muted-foreground">Loading trend data...</p>
                  </div>
                ) : (
                  <MonthlyTrendChart
                    data={yearlyTrendData || []}
                    currentMonth={selectedMonth}
                    year={selectedYear}
                  />
                )}
              </div>
            </div>

            {/* Bar Chart */}
            <ParametersBarChart
              data={barChartData}
              title="KPI Parameters"
              subtitle={`${selectedMonth} Performance`}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
