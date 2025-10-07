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

    return [
      { name: 'Man Days', target: metric.manDaysTarget || 0, actual: metric.manDaysActual || 0 },
      { name: 'Safe Hours', target: metric.safeWorkHoursTarget || 0, actual: metric.safeWorkHoursActual || 0 },
      { name: 'Safety Induction', target: metric.safetyInductionTarget || 0, actual: metric.safetyInductionActual || 0 },
      { name: 'Toolbox Talk', target: metric.toolBoxTalkTarget || 0, actual: metric.toolBoxTalkActual || 0 },
      { name: 'Job Training', target: metric.jobSpecificTrainingTarget || 0, actual: metric.jobSpecificTrainingActual || 0 },
      { name: 'Inspections', target: metric.formalSafetyInspectionTarget || 0, actual: metric.formalSafetyInspectionActual || 0 },
      { name: 'Non-Comp Raised', target: metric.nonComplianceRaisedTarget || 0, actual: metric.nonComplianceRaisedActual || 0 },
      { name: 'Non-Comp Close', target: metric.nonComplianceCloseTarget || 0, actual: metric.nonComplianceCloseActual || 0 },
      { name: 'Obs Raised', target: metric.safetyObservationRaisedTarget || 0, actual: metric.safetyObservationRaisedActual || 0 },
      { name: 'Obs Close', target: metric.safetyObservationCloseTarget || 0, actual: metric.safetyObservationCloseActual || 0 },
      { name: 'Work Permits', target: metric.workPermitIssuedTarget || 0, actual: metric.workPermitIssuedActual || 0 },
      { name: 'SWMS', target: metric.safeWorkMethodStatementTarget || 0, actual: metric.safeWorkMethodStatementActual || 0 },
      { name: 'Mock Drills', target: metric.emergencyMockDrillsTarget || 0, actual: metric.emergencyMockDrillsActual || 0 },
      { name: 'Internal Audit', target: metric.internalAuditTarget || 0, actual: metric.internalAuditActual || 0 },
      { name: 'Near Miss', target: metric.nearMissReportTarget || 0, actual: metric.nearMissReportActual || 0 },
      { name: 'First Aid', target: metric.firstAidInjuryTarget || 0, actual: metric.firstAidInjuryActual || 0 },
      { name: 'Medical Treat', target: metric.medicalTreatmentInjuryTarget || 0, actual: metric.medicalTreatmentInjuryActual || 0 },
      { name: 'Lost Time', target: metric.lostTimeInjuryTarget || 0, actual: metric.lostTimeInjuryActual || 0 },
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
