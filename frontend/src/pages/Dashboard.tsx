import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout.tsx';
import AppSidebar from '@/components/layout/AppSidebar.tsx';
import GaugeChart from '@/components/dashboard/GaugeChart.tsx';
import MonthlyTrendChart from '@/components/dashboard/MonthlyTrendChart.tsx';
import ParametersBarChart from '@/components/dashboard/ParametersBarChart.tsx';
import ParameterCard from '@/components/dashboard/ParameterCard.tsx';
import { Button } from '@/components/ui/button.tsx';
import { dashboardService } from '@/services/dashboard.service.ts';
import { useAuthStore } from '@/store/authStore.ts';
import {
  Users,
  Clock,
  GraduationCap,
  MessageSquare,
  Briefcase,
  Search,
  AlertTriangle,
  CheckCircle,
  Eye,
  XCircle,
  FileText,
  Shield,
  Siren,
  ClipboardCheck,
  FileWarning,
  Bandage,
  Stethoscope,
  UserX,
  Upload,
} from 'lucide-react';

type CategoryKey = 'operational' | 'training' | 'compliance' | 'documentation' | 'emergency' | 'incidents';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  // Filter state
  const currentDate = new Date();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const [selectedSite, setSelectedSite] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(monthNames[currentDate.getMonth()]);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Category visibility state - all enabled by default
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

  // Process metrics data from API
  const processMetricsData = () => {
    // If no data, return empty arrays
    if (!metricsData || metricsData.length === 0) {
      return {
        operational: [],
        training: [],
        compliance: [],
        documentation: [],
        emergency: [],
        incidents: [],
      };
    }

    // Map API data to display format
    const metric = metricsData[0]; // Get first metric (should be aggregated)

    return {
      operational: [
        {
          title: 'Man Days',
          icon: Users,
          target: metric.manDaysTarget || 0,
          actual: metric.manDaysActual || 0,
          score: Number(metric.manDaysScore) * 10 || 0,
          unit: 'days'
        },
        {
          title: 'Safe Work Hours Cumulative',
          icon: Clock,
          target: metric.safeWorkHoursTarget || 0,
          actual: metric.safeWorkHoursActual || 0,
          score: Number(metric.safeWorkHoursScore) * 10 || 0,
          unit: 'hrs'
        },
      ],
      training: [
        {
          title: 'Safety Induction',
          icon: GraduationCap,
          target: metric.safetyInductionTarget || 0,
          actual: metric.safetyInductionActual || 0,
          score: Number(metric.safetyInductionScore) * 10 || 0,
          unit: 'persons'
        },
        {
          title: 'Tool Box Talk',
          icon: MessageSquare,
          target: metric.toolBoxTalkTarget || 0,
          actual: metric.toolBoxTalkActual || 0,
          score: Number(metric.toolBoxTalkScore) * 10 || 0,
          unit: 'sessions'
        },
        {
          title: 'Job Specific Training',
          icon: Briefcase,
          target: metric.jobSpecificTrainingTarget || 0,
          actual: metric.jobSpecificTrainingActual || 0,
          score: Number(metric.jobSpecificTrainingScore) * 10 || 0,
          unit: 'sessions'
        },
      ],
      compliance: [
        {
          title: 'Formal Safety Inspection Done',
          icon: Search,
          target: metric.formalSafetyInspectionTarget || 0,
          actual: metric.formalSafetyInspectionActual || 0,
          score: Number(metric.formalSafetyInspectionScore) * 10 || 0,
          unit: 'inspections'
        },
        {
          title: 'Non-Compliance Raised',
          icon: AlertTriangle,
          target: metric.nonComplianceRaisedTarget || 0,
          actual: metric.nonComplianceRaisedActual || 0,
          score: Number(metric.nonComplianceRaisedScore) * 10 || 0,
          unit: 'cases'
        },
        {
          title: 'Non-Compliance Close',
          icon: CheckCircle,
          target: metric.nonComplianceCloseTarget || 0,
          actual: metric.nonComplianceCloseActual || 0,
          score: Number(metric.nonComplianceCloseScore) * 10 || 0,
          unit: 'cases'
        },
        {
          title: 'Safety Observation Raised',
          icon: Eye,
          target: metric.safetyObservationRaisedTarget || 0,
          actual: metric.safetyObservationRaisedActual || 0,
          score: Number(metric.safetyObservationRaisedScore) * 10 || 0,
          unit: 'observations'
        },
        {
          title: 'Safety Observation Close',
          icon: XCircle,
          target: metric.safetyObservationCloseTarget || 0,
          actual: metric.safetyObservationCloseActual || 0,
          score: Number(metric.safetyObservationCloseScore) * 10 || 0,
          unit: 'observations'
        },
      ],
      documentation: [
        {
          title: 'Work Permit Issued',
          icon: FileText,
          target: metric.workPermitIssuedTarget || 0,
          actual: metric.workPermitIssuedActual || 0,
          score: Number(metric.workPermitIssuedScore) * 10 || 0,
          unit: 'permits'
        },
        {
          title: 'Safe Work Method Statement',
          icon: Shield,
          target: metric.safeWorkMethodStatementTarget || 0,
          actual: metric.safeWorkMethodStatementActual || 0,
          score: Number(metric.safeWorkMethodStatementScore) * 10 || 0,
          unit: 'statements'
        },
      ],
      emergency: [
        {
          title: 'Emergency Preparedness Mock Drills',
          icon: Siren,
          target: metric.emergencyMockDrillsTarget || 0,
          actual: metric.emergencyMockDrillsActual || 0,
          score: Number(metric.emergencyMockDrillsScore) * 10 || 0,
          unit: 'drills'
        },
        {
          title: 'Internal Audit',
          icon: ClipboardCheck,
          target: metric.internalAuditTarget || 0,
          actual: metric.internalAuditActual || 0,
          score: Number(metric.internalAuditScore) * 10 || 0,
          unit: 'audits'
        },
      ],
      incidents: [
        {
          title: 'Near Miss Report',
          icon: FileWarning,
          target: metric.nearMissReportTarget || 0,
          actual: metric.nearMissReportActual || 0,
          score: Number(metric.nearMissReportScore) * 10 || 0,
          unit: 'incidents',
          isIncident: true
        },
        {
          title: 'First Aid Injury',
          icon: Bandage,
          target: metric.firstAidInjuryTarget || 0,
          actual: metric.firstAidInjuryActual || 0,
          score: Number(metric.firstAidInjuryScore) * 10 || 0,
          unit: 'injuries',
          isIncident: true
        },
        {
          title: 'Medical Treatment Injury',
          icon: Stethoscope,
          target: metric.medicalTreatmentInjuryTarget || 0,
          actual: metric.medicalTreatmentInjuryActual || 0,
          score: Number(metric.medicalTreatmentInjuryScore) * 10 || 0,
          unit: 'injuries',
          isIncident: true
        },
        {
          title: 'Lost Time Injury',
          icon: UserX,
          target: metric.lostTimeInjuryTarget || 0,
          actual: metric.lostTimeInjuryActual || 0,
          score: Number(metric.lostTimeInjuryScore) * 10 || 0,
          unit: 'injuries',
          isIncident: true
        },
      ],
    };
  };

  const displayData = processMetricsData();

  // Calculate parameter statistics (Target Met / Close / Below)
  const calculateParameterStats = () => {
    if (!metricsData || metricsData.length === 0) {
      return { targetMet: 0, close: 0, below: 0 };
    }

    const metric = metricsData[0];
    let targetMet = 0;
    let close = 0;
    let below = 0;

    // List all 18 parameters with their scores (0-10 scale in DB)
    const parameters = [
      { score: Number(metric.manDaysScore) || 0, target: metric.manDaysTarget || 0, actual: metric.manDaysActual || 0 },
      { score: Number(metric.safeWorkHoursScore) || 0, target: metric.safeWorkHoursTarget || 0, actual: metric.safeWorkHoursActual || 0 },
      { score: Number(metric.safetyInductionScore) || 0, target: metric.safetyInductionTarget || 0, actual: metric.safetyInductionActual || 0 },
      { score: Number(metric.toolBoxTalkScore) || 0, target: metric.toolBoxTalkTarget || 0, actual: metric.toolBoxTalkActual || 0 },
      { score: Number(metric.jobSpecificTrainingScore) || 0, target: metric.jobSpecificTrainingTarget || 0, actual: metric.jobSpecificTrainingActual || 0 },
      { score: Number(metric.formalSafetyInspectionScore) || 0, target: metric.formalSafetyInspectionTarget || 0, actual: metric.formalSafetyInspectionActual || 0 },
      { score: Number(metric.nonComplianceRaisedScore) || 0, target: metric.nonComplianceRaisedTarget || 0, actual: metric.nonComplianceRaisedActual || 0 },
      { score: Number(metric.nonComplianceCloseScore) || 0, target: metric.nonComplianceCloseTarget || 0, actual: metric.nonComplianceCloseActual || 0 },
      { score: Number(metric.safetyObservationRaisedScore) || 0, target: metric.safetyObservationRaisedTarget || 0, actual: metric.safetyObservationRaisedActual || 0 },
      { score: Number(metric.safetyObservationCloseScore) || 0, target: metric.safetyObservationCloseTarget || 0, actual: metric.safetyObservationCloseActual || 0 },
      { score: Number(metric.workPermitIssuedScore) || 0, target: metric.workPermitIssuedTarget || 0, actual: metric.workPermitIssuedActual || 0 },
      { score: Number(metric.safeWorkMethodStatementScore) || 0, target: metric.safeWorkMethodStatementTarget || 0, actual: metric.safeWorkMethodStatementActual || 0 },
      { score: Number(metric.emergencyMockDrillsScore) || 0, target: metric.emergencyMockDrillsTarget || 0, actual: metric.emergencyMockDrillsActual || 0 },
      { score: Number(metric.internalAuditScore) || 0, target: metric.internalAuditTarget || 0, actual: metric.internalAuditActual || 0 },
      { score: Number(metric.nearMissReportScore) || 0, target: metric.nearMissReportTarget || 0, actual: metric.nearMissReportActual || 0 },
      { score: Number(metric.firstAidInjuryScore) || 0, target: metric.firstAidInjuryTarget || 0, actual: metric.firstAidInjuryActual || 0 },
      { score: Number(metric.medicalTreatmentInjuryScore) || 0, target: metric.medicalTreatmentInjuryTarget || 0, actual: metric.medicalTreatmentInjuryActual || 0 },
      { score: Number(metric.lostTimeInjuryScore) || 0, target: metric.lostTimeInjuryTarget || 0, actual: metric.lostTimeInjuryActual || 0 },
    ];

    // Categorize each parameter based on score
    // Target Met: score >= 9.0 (90%+)
    // Close: score >= 7.0 and < 9.0 (70-89%)
    // Below: score < 7.0 (<70%)
    parameters.forEach((param) => {
      if (param.score >= 9.0) {
        targetMet++;
      } else if (param.score >= 7.0) {
        close++;
      } else {
        below++;
      }
    });

    return { targetMet, close, below };
  };

  // Prepare data for overall bar chart (all 18 parameters) - with achievement percentages
  const prepareBarChartData = () => {
    if (!metricsData || metricsData.length === 0) return [];

    const metric = metricsData[0];

    // Helper function to calculate percentage
    const calcPercentage = (actual: number, target: number, isIncident: boolean = false) => {
      if (isIncident) {
        // For incidents: 0 actual = 100%, any incident = 0%
        return actual === 0 ? 100 : 0;
      }
      if (target === 0) return 0;
      return Math.min((actual / target) * 100, 100);
    };

    return [
      { name: 'Man Days', percentage: calcPercentage(metric.manDaysActual || 0, metric.manDaysTarget || 0) },
      { name: 'Safe Work Hours', percentage: calcPercentage(metric.safeWorkHoursActual || 0, metric.safeWorkHoursTarget || 0) },
      { name: 'Safety Induction', percentage: calcPercentage(metric.safetyInductionActual || 0, metric.safetyInductionTarget || 0) },
      { name: 'Toolbox Talk', percentage: calcPercentage(metric.toolBoxTalkActual || 0, metric.toolBoxTalkTarget || 0) },
      { name: 'Job Training', percentage: calcPercentage(metric.jobSpecificTrainingActual || 0, metric.jobSpecificTrainingTarget || 0) },
      { name: 'Safety Inspection', percentage: calcPercentage(metric.formalSafetyInspectionActual || 0, metric.formalSafetyInspectionTarget || 0) },
      { name: 'Non-Comp Raised', percentage: calcPercentage(metric.nonComplianceRaisedActual || 0, metric.nonComplianceRaisedTarget || 0, true) },
      { name: 'Non-Comp Close', percentage: calcPercentage(metric.nonComplianceCloseActual || 0, metric.nonComplianceCloseTarget || 0) },
      { name: 'Safety Obs Raised', percentage: calcPercentage(metric.safetyObservationRaisedActual || 0, metric.safetyObservationRaisedTarget || 0) },
      { name: 'Safety Obs Close', percentage: calcPercentage(metric.safetyObservationCloseActual || 0, metric.safetyObservationCloseTarget || 0) },
      { name: 'Work Permit', percentage: calcPercentage(metric.workPermitIssuedActual || 0, metric.workPermitIssuedTarget || 0) },
      { name: 'SWMS', percentage: calcPercentage(metric.safeWorkMethodStatementActual || 0, metric.safeWorkMethodStatementTarget || 0) },
      { name: 'Mock Drills', percentage: calcPercentage(metric.emergencyMockDrillsActual || 0, metric.emergencyMockDrillsTarget || 0) },
      { name: 'Internal Audit', percentage: calcPercentage(metric.internalAuditActual || 0, metric.internalAuditTarget || 0) },
      { name: 'Near Miss', percentage: calcPercentage(metric.nearMissReportActual || 0, metric.nearMissReportTarget || 0, true) },
      { name: 'First Aid', percentage: calcPercentage(metric.firstAidInjuryActual || 0, metric.firstAidInjuryTarget || 0, true) },
      { name: 'Med Treatment', percentage: calcPercentage(metric.medicalTreatmentInjuryActual || 0, metric.medicalTreatmentInjuryTarget || 0, true) },
      { name: 'Lost Time Injury', percentage: calcPercentage(metric.lostTimeInjuryActual || 0, metric.lostTimeInjuryTarget || 0, true) },
    ];
  };

  // Calculate cumulative score from real data
  const calculateCumulativeScore = () => {
    if (!metricsData || metricsData.length === 0) {
      return { totalScore: 0, maxScore: 100, rating: 'LOW' as const, parameterStats: { targetMet: 0, close: 0, below: 0 } };
    }

    const metric = metricsData[0];
    const parameterStats = calculateParameterStats();

    return {
      totalScore: Number(metric.totalScore) || 0,
      maxScore: Number(metric.maxScore) || 100,
      rating: (metric.rating || 'LOW') as 'LOW' | 'MEDIUM' | 'HIGH',
      parameterStats,
    };
  };

  const cumulativeScore = calculateCumulativeScore();

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
      <div className="space-y-8">
        {/* Header with Import Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Safety Dashboard</h1>
            <p className="text-gray-600 mt-1">Track and monitor safety metrics across all sites</p>
          </div>
          {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
            <Button onClick={() => navigate('/import')} className="gap-2">
              <Upload className="w-4 h-4" />
              Import from Excel
            </Button>
          )}
        </div>

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
              No safety metrics found for the selected site, month, and year.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Try selecting a different combination or add data for this period.
            </p>
            {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
              <Button onClick={() => navigate('/import')} variant="outline" className="mt-4 gap-2">
                <Upload className="w-4 h-4" />
                Import Data from Excel
              </Button>
            )}
          </div>
        )}

        {/* Overall KPI Section with Gauge and Metrics */}
        {!metricsLoading && metricsData && metricsData.length > 0 && (
          <>
            {/* Top Section: Gauge + Monthly Trend Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Gauge Chart - Left */}
              <div className="lg:col-span-1">
                <GaugeChart
                  value={cumulativeScore.totalScore}
                  max={cumulativeScore.maxScore}
                  title="KPI Achievement Score"
                  subtitle={`${selectedMonth} Performance`}
                />
              </div>

              {/* Monthly Trend Chart - Right */}
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

            {/* Overall Bar Chart - All 18 Parameters */}
            <ParametersBarChart
              data={prepareBarChartData()}
              title="KPI Parameters Achievement"
              subtitle={`Performance Overview - ${selectedMonth} ${selectedYear}`}
            />
          </>
        )}

        {/* Operational Metrics */}
        {!metricsLoading && enabledCategories.operational && displayData.operational.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 bg-blue-500 rounded" />
              <h2 className="text-xl font-bold">Operational Metrics</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayData.operational.map((param, idx) => (
                <ParameterCard key={idx} {...param} />
              ))}
            </div>
          </section>
        )}

        {/* Training Metrics */}
        {!metricsLoading && enabledCategories.training && displayData.training.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 bg-purple-500 rounded" />
              <h2 className="text-xl font-bold">Training & Induction</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayData.training.map((param, idx) => (
                <ParameterCard key={idx} {...param} />
              ))}
            </div>
          </section>
        )}

        {/* Compliance Metrics */}
        {!metricsLoading && enabledCategories.compliance && displayData.compliance.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 bg-indigo-500 rounded" />
              <h2 className="text-xl font-bold">Inspection & Compliance</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayData.compliance.map((param, idx) => (
                <ParameterCard key={idx} {...param} />
              ))}
            </div>
          </section>
        )}

        {/* Documentation */}
        {!metricsLoading && enabledCategories.documentation && displayData.documentation.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 bg-cyan-500 rounded" />
              <h2 className="text-xl font-bold">Documentation</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayData.documentation.map((param, idx) => (
                <ParameterCard key={idx} {...param} />
              ))}
            </div>
          </section>
        )}

        {/* Emergency & Audit */}
        {!metricsLoading && enabledCategories.emergency && displayData.emergency.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 bg-orange-500 rounded" />
              <h2 className="text-xl font-bold">Emergency & Audit</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayData.emergency.map((param, idx) => (
                <ParameterCard key={idx} {...param} />
              ))}
            </div>
          </section>
        )}

        {/* Incident Reports */}
        {!metricsLoading && enabledCategories.incidents && displayData.incidents.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 bg-red-500 rounded" />
              <h2 className="text-xl font-bold">Incident Reports</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayData.incidents.map((param, idx) => (
                <ParameterCard key={idx} {...param} />
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
