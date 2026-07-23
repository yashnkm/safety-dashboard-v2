import { useState, useEffect, useRef } from 'react';
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
  HardHat,
  Glasses,
  Calendar as CalendarIcon,
  AlertOctagon,
  Trash2,
  Recycle,
  Zap,
  Droplets,
  LeafyGreen,
  Heart,
  TestTube,
  Building2,
  Info,
  FileDown,
} from 'lucide-react';
import { exportDashboardToPdf } from '@/lib/pdfExport';

type CategoryKey = 'operational' | 'training' | 'compliance' | 'documentation' | 'emergency' | 'incidents' | 'ppe' | 'environment' | 'health';

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
    ppe: true,
    environment: true,
    health: true,
  });

  // Tracks whether the initial month/year has already been set, either from
  // a just-completed Excel import or from the "latest period with data" lookup
  // below — prevents the two from fighting each other on mount.
  const filtersInitializedRef = useRef(false);

  // Check for lastImport from localStorage (after Excel import)
  useEffect(() => {
    const lastImportStr = localStorage.getItem('lastImport');
    if (lastImportStr) {
      try {
        const lastImport = JSON.parse(lastImportStr);
        if (lastImport.siteId) setSelectedSite(lastImport.siteId);
        if (lastImport.month) setSelectedMonth(lastImport.month);
        if (lastImport.year) setSelectedYear(lastImport.year);
        filtersInitializedRef.current = true;
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

  // Fetch every accessible metric (unfiltered) once, purely to find the most
  // recent month/year that actually has data — so the dashboard doesn't default
  // to the current calendar month and show "No Data Available" when the latest
  // real entries are from a prior month.
  const { data: latestPeriodData } = useQuery({
    queryKey: ['latestPeriod'],
    queryFn: () => dashboardService.getMetrics({}),
  });

  useEffect(() => {
    if (filtersInitializedRef.current) return;
    if (!latestPeriodData || latestPeriodData.length === 0) return;

    const latest = latestPeriodData.reduce((best: any, m: any) => {
      if (!best) return m;
      if (m.year !== best.year) return m.year > best.year ? m : best;
      return monthNames.indexOf(m.month) > monthNames.indexOf(best.month) ? m : best;
    }, null);

    if (latest) {
      setSelectedMonth(latest.month);
      setSelectedYear(latest.year);
      filtersInitializedRef.current = true;
    }
  }, [latestPeriodData]);

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
        ppe: [],
        environment: [],
        health: [],
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
          weight: 2,
          unit: 'days'
        },
        {
          title: 'Safe Work Hours Cumulative',
          icon: Clock,
          target: metric.safeWorkHoursTarget || 0,
          actual: metric.safeWorkHoursActual || 0,
          score: Number(metric.safeWorkHoursScore) * 10 || 0,
          weight: 2,
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
          weight: 2,
          unit: 'persons'
        },
        {
          title: 'Tool Box Talk',
          icon: MessageSquare,
          target: metric.toolBoxTalkTarget || 0,
          actual: metric.toolBoxTalkActual || 0,
          score: Number(metric.toolBoxTalkScore) * 10 || 0,
          weight: 2,
          unit: 'sessions'
        },
        {
          title: 'Job Specific Training',
          icon: Briefcase,
          target: metric.jobSpecificTrainingTarget || 0,
          actual: metric.jobSpecificTrainingActual || 0,
          score: Number(metric.jobSpecificTrainingScore) * 10 || 0,
          weight: 2,
          unit: 'sessions'
        },
        {
          title: 'Workforce Trained %',
          icon: Users,
          target: metric.workforceTrainedTarget || 0,
          actual: metric.workforceTrainedActual || 0,
          score: Number(metric.workforceTrainedScore) * 10 || 0,
          weight: 4,
          unit: '%'
        },
        {
          title: 'Upcoming Trainings',
          icon: CalendarIcon,
          target: metric.upcomingTrainingsTarget || 0,
          actual: metric.upcomingTrainingsActual || 0,
          score: Number(metric.upcomingTrainingsScore) * 10 || 0,
          weight: 2,
          unit: 'sessions'
        },
        {
          title: 'Overdue Trainings',
          icon: AlertOctagon,
          target: metric.overdueTrainingsTarget || 0,
          actual: metric.overdueTrainingsActual || 0,
          score: Number(metric.overdueTrainingsScore) * 10 || 0,
          weight: 4,
          unit: 'sessions',
          isIncident: true
        },
      ],
      compliance: [
        {
          title: 'Formal Safety Inspection Done',
          icon: Search,
          target: metric.formalSafetyInspectionTarget || 0,
          actual: metric.formalSafetyInspectionActual || 0,
          score: Number(metric.formalSafetyInspectionScore) * 10 || 0,
          weight: 2,
          unit: 'inspections'
        },
        {
          title: 'Non-Compliance Raised',
          icon: AlertTriangle,
          target: metric.nonComplianceRaisedTarget || 0,
          actual: metric.nonComplianceRaisedActual || 0,
          score: Number(metric.nonComplianceRaisedScore) * 10 || 0,
          weight: 4,
          unit: 'cases'
        },
        {
          title: 'Non-Compliance Close',
          icon: CheckCircle,
          target: metric.nonComplianceCloseTarget || 0,
          actual: metric.nonComplianceCloseActual || 0,
          score: Number(metric.nonComplianceCloseScore) * 10 || 0,
          weight: 1,
          unit: 'cases'
        },
        {
          title: 'Safety Observation Raised',
          icon: Eye,
          target: metric.safetyObservationRaisedTarget || 0,
          actual: metric.safetyObservationRaisedActual || 0,
          score: Number(metric.safetyObservationRaisedScore) * 10 || 0,
          weight: 2,
          unit: 'observations'
        },
        {
          title: 'Safety Observation Close',
          icon: XCircle,
          target: metric.safetyObservationCloseTarget || 0,
          actual: metric.safetyObservationCloseActual || 0,
          score: Number(metric.safetyObservationCloseScore) * 10 || 0,
          weight: 1,
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
          weight: 1,
          unit: 'permits'
        },
        {
          title: 'Safe Work Method Statement',
          icon: Shield,
          target: metric.safeWorkMethodStatementTarget || 0,
          actual: metric.safeWorkMethodStatementActual || 0,
          score: Number(metric.safeWorkMethodStatementScore) * 10 || 0,
          weight: 1,
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
          weight: 2,
          unit: 'drills'
        },
        {
          title: 'Internal Audit',
          icon: ClipboardCheck,
          target: metric.internalAuditTarget || 0,
          actual: metric.internalAuditActual || 0,
          score: Number(metric.internalAuditScore) * 10 || 0,
          weight: 2,
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
          weight: 8,
          unit: 'incidents',
          isIncident: true
        },
        {
          title: 'First Aid Injury',
          icon: Bandage,
          target: metric.firstAidInjuryTarget || 0,
          actual: metric.firstAidInjuryActual || 0,
          score: Number(metric.firstAidInjuryScore) * 10 || 0,
          weight: 8,
          unit: 'injuries',
          isIncident: true
        },
        {
          title: 'Medical Treatment Injury',
          icon: Stethoscope,
          target: metric.medicalTreatmentInjuryTarget || 0,
          actual: metric.medicalTreatmentInjuryActual || 0,
          score: Number(metric.medicalTreatmentInjuryScore) * 10 || 0,
          weight: 8,
          unit: 'injuries',
          isIncident: true
        },
        {
          title: 'Lost Time Injury',
          icon: UserX,
          target: metric.lostTimeInjuryTarget || 0,
          actual: metric.lostTimeInjuryActual || 0,
          score: Number(metric.lostTimeInjuryScore) * 10 || 0,
          weight: 8,
          unit: 'injuries',
          isIncident: true
        },
        {
          title: 'Recordable Incidents',
          icon: AlertTriangle,
          target: metric.recordableIncidentsTarget || 0,
          actual: metric.recordableIncidentsActual || 0,
          score: Number(metric.recordableIncidentsScore) * 10 || 0,
          weight: 8,
          unit: 'incidents',
          isIncident: true
        },
      ],
      ppe: [
        {
          title: 'PPE Compliance Rate',
          icon: HardHat,
          target: metric.ppeComplianceRateTarget || 0,
          actual: metric.ppeComplianceRateActual || 0,
          score: Number(metric.ppeComplianceRateScore) * 10 || 0,
          weight: 4,
          unit: '%'
        },
        {
          title: 'PPE Observations',
          icon: Glasses,
          target: metric.ppeObservationsTarget || 0,
          actual: metric.ppeObservationsActual || 0,
          score: Number(metric.ppeObservationsScore) * 10 || 0,
          weight: 2,
          unit: 'observations'
        },
      ],
      environment: [
        {
          title: 'Waste Generated',
          icon: Trash2,
          target: metric.wasteGeneratedTarget || 0,
          actual: metric.wasteGeneratedActual || 0,
          score: Number(metric.wasteGeneratedScore) * 10 || 0,
          weight: 2,
          unit: 'kg',
          lowerIsBetter: true
        },
        {
          title: 'Waste Disposed',
          icon: Recycle,
          target: metric.wasteDisposedTarget || 0,
          actual: metric.wasteDisposedActual || 0,
          score: Number(metric.wasteDisposedScore) * 10 || 0,
          weight: 2,
          unit: 'kg'
        },
        {
          title: 'Energy Consumption',
          icon: Zap,
          target: metric.energyConsumptionTarget || 0,
          actual: metric.energyConsumptionActual || 0,
          score: Number(metric.energyConsumptionScore) * 10 || 0,
          weight: 2,
          unit: 'kW',
          lowerIsBetter: true
        },
        {
          title: 'Water Consumption',
          icon: Droplets,
          target: metric.waterConsumptionTarget || 0,
          actual: metric.waterConsumptionActual || 0,
          score: Number(metric.waterConsumptionScore) * 10 || 0,
          weight: 2,
          unit: 'ltr',
          lowerIsBetter: true
        },
        {
          title: 'Spills Incidents',
          icon: Droplets,
          target: metric.spillsIncidentsTarget || 0,
          actual: metric.spillsIncidentsActual || 0,
          score: Number(metric.spillsIncidentsScore) * 10 || 0,
          weight: 2,
          unit: 'incidents',
          isIncident: true
        },
        {
          title: 'Environmental Incidents',
          icon: LeafyGreen,
          target: metric.environmentalIncidentsTarget || 0,
          actual: metric.environmentalIncidentsActual || 0,
          score: Number(metric.environmentalIncidentsScore) * 10 || 0,
          weight: 2,
          unit: 'incidents',
          isIncident: true
        },
      ],
      health: [
        {
          title: 'Health Checkup Compliance',
          icon: Heart,
          target: metric.healthCheckupComplianceTarget || 0,
          actual: metric.healthCheckupComplianceActual || 0,
          score: Number(metric.healthCheckupComplianceScore) * 10 || 0,
          weight: 4,
          unit: '%'
        },
        {
          title: 'Water Quality Test',
          icon: TestTube,
          target: metric.waterQualityTestTarget || 0,
          actual: metric.waterQualityTestActual || 0,
          score: Number(metric.waterQualityTestScore) * 10 || 0,
          weight: 2,
          unit: 'tests'
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

    // List all 32 parameters with their scores (0-10 scale in DB)
    const parameters = [
      // Original 18 parameters
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
      // New 14 parameters
      { score: Number(metric.recordableIncidentsScore) || 0, target: metric.recordableIncidentsTarget || 0, actual: metric.recordableIncidentsActual || 0 },
      { score: Number(metric.ppeComplianceRateScore) || 0, target: metric.ppeComplianceRateTarget || 0, actual: metric.ppeComplianceRateActual || 0 },
      { score: Number(metric.ppeObservationsScore) || 0, target: metric.ppeObservationsTarget || 0, actual: metric.ppeObservationsActual || 0 },
      { score: Number(metric.workforceTrainedScore) || 0, target: metric.workforceTrainedTarget || 0, actual: metric.workforceTrainedActual || 0 },
      { score: Number(metric.upcomingTrainingsScore) || 0, target: metric.upcomingTrainingsTarget || 0, actual: metric.upcomingTrainingsActual || 0 },
      { score: Number(metric.overdueTrainingsScore) || 0, target: metric.overdueTrainingsTarget || 0, actual: metric.overdueTrainingsActual || 0 },
      { score: Number(metric.wasteGeneratedScore) || 0, target: metric.wasteGeneratedTarget || 0, actual: metric.wasteGeneratedActual || 0 },
      { score: Number(metric.wasteDisposedScore) || 0, target: metric.wasteDisposedTarget || 0, actual: metric.wasteDisposedActual || 0 },
      { score: Number(metric.energyConsumptionScore) || 0, target: metric.energyConsumptionTarget || 0, actual: metric.energyConsumptionActual || 0 },
      { score: Number(metric.waterConsumptionScore) || 0, target: metric.waterConsumptionTarget || 0, actual: metric.waterConsumptionActual || 0 },
      { score: Number(metric.spillsIncidentsScore) || 0, target: metric.spillsIncidentsTarget || 0, actual: metric.spillsIncidentsActual || 0 },
      { score: Number(metric.environmentalIncidentsScore) || 0, target: metric.environmentalIncidentsTarget || 0, actual: metric.environmentalIncidentsActual || 0 },
      { score: Number(metric.healthCheckupComplianceScore) || 0, target: metric.healthCheckupComplianceTarget || 0, actual: metric.healthCheckupComplianceActual || 0 },
      { score: Number(metric.waterQualityTestScore) || 0, target: metric.waterQualityTestTarget || 0, actual: metric.waterQualityTestActual || 0 },
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

  // Prepare data for overall bar chart (all 32 parameters) - with achievement percentages
  const prepareBarChartData = () => {
    if (!metricsData || metricsData.length === 0) return [];

    const metric = metricsData[0];

    // Read each parameter's achievement % directly from the backend-computed
    // score (stored 0-10, scaled to 0-100) instead of re-deriving it here.
    // A local re-implementation of the scoring rules previously drifted out
    // of sync with the backend's (e.g. still showing 0% for Near Miss Report
    // after it stopped being penalized for non-zero counts) — reading the
    // same value the backend already computed makes that class of bug
    // impossible.
    const pct = (score: any) => (Number(score) || 0) * 10;

    return [
      // Original 18 parameters
      { name: 'Man Days', percentage: pct(metric.manDaysScore) },
      { name: 'Safe Work Hours', percentage: pct(metric.safeWorkHoursScore) },
      { name: 'Safety Induction', percentage: pct(metric.safetyInductionScore) },
      { name: 'Toolbox Talk', percentage: pct(metric.toolBoxTalkScore) },
      { name: 'Job Training', percentage: pct(metric.jobSpecificTrainingScore) },
      { name: 'Safety Inspection', percentage: pct(metric.formalSafetyInspectionScore) },
      { name: 'Non-Comp Raised', percentage: pct(metric.nonComplianceRaisedScore) },
      { name: 'Non-Comp Close', percentage: pct(metric.nonComplianceCloseScore) },
      { name: 'Safety Obs Raised', percentage: pct(metric.safetyObservationRaisedScore) },
      { name: 'Safety Obs Close', percentage: pct(metric.safetyObservationCloseScore) },
      { name: 'Work Permit', percentage: pct(metric.workPermitIssuedScore) },
      { name: 'SWMS', percentage: pct(metric.safeWorkMethodStatementScore) },
      { name: 'Mock Drills', percentage: pct(metric.emergencyMockDrillsScore) },
      { name: 'Internal Audit', percentage: pct(metric.internalAuditScore) },
      { name: 'Near Miss', percentage: pct(metric.nearMissReportScore) },
      { name: 'First Aid', percentage: pct(metric.firstAidInjuryScore) },
      { name: 'Med Treatment', percentage: pct(metric.medicalTreatmentInjuryScore) },
      { name: 'Lost Time Injury', percentage: pct(metric.lostTimeInjuryScore) },
      // New 14 parameters
      { name: 'Recordable Incidents', percentage: pct(metric.recordableIncidentsScore) },
      { name: 'PPE Compliance %', percentage: pct(metric.ppeComplianceRateScore) },
      { name: 'PPE Observations', percentage: pct(metric.ppeObservationsScore) },
      { name: 'Workforce Trained %', percentage: pct(metric.workforceTrainedScore) },
      { name: 'Upcoming Trainings', percentage: pct(metric.upcomingTrainingsScore) },
      { name: 'Overdue Trainings', percentage: pct(metric.overdueTrainingsScore) },
      { name: 'Waste Generated', percentage: pct(metric.wasteGeneratedScore) },
      { name: 'Waste Disposed', percentage: pct(metric.wasteDisposedScore) },
      { name: 'Energy Consumption', percentage: pct(metric.energyConsumptionScore) },
      { name: 'Water Consumption', percentage: pct(metric.waterConsumptionScore) },
      { name: 'Spills Incidents', percentage: pct(metric.spillsIncidentsScore) },
      { name: 'Environmental Incidents', percentage: pct(metric.environmentalIncidentsScore) },
      { name: 'Health Checkup %', percentage: pct(metric.healthCheckupComplianceScore) },
      { name: 'Water Quality Tests', percentage: pct(metric.waterQualityTestScore) },
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

  // Which site/company the numbers on screen actually belong to. "All Sites"
  // does not aggregate across sites — it just shows whichever record the API
  // returns first — so make that explicit instead of leaving it ambiguous,
  // especially once more than one site has data for the same period.
  const getDataSourceInfo = () => {
    if (!metricsData || metricsData.length === 0) return null;

    const distinctSiteIds = new Set(metricsData.map((m: any) => m.siteId));
    const primary = metricsData[0];
    const matchedSite = sites.find((s: any) => s.id === primary.siteId);
    const siteName = matchedSite?.siteName || primary.site?.siteName || 'Unknown site';
    const companyName = matchedSite?.company?.companyName;
    const label = companyName ? `${siteName} (${companyName})` : siteName;
    const otherCount = distinctSiteIds.size - 1;

    return { label, isAmbiguous: otherCount > 0, otherCount };
  };

  const dataSourceInfo = getDataSourceInfo();

  // How many of the 32 parameters actually had data entered this period vs.
  // were left blank (target=0, actual=0). Surfaced separately from the score
  // itself so a partially-empty month doesn't read as an outright bad one -
  // blank parameters show as "Not Reported" on their cards, not red.
  //
  // The official KPI score/rating (cumulativeScore, below) deliberately
  // still counts blank parameters as 0 toward the fixed 100-point total -
  // excluding them from the real score was considered and rejected, since
  // it would let a site inflate its score by leaving a bad metric blank
  // instead of reporting a real bad number. adjustedPercentage here is
  // purely informational context alongside the unchanged official score,
  // not a replacement for it.
  const dataCompleteness = (() => {
    if (!metricsData || metricsData.length === 0) return null;
    const allParams = Object.values(displayData).flat() as Array<{
      target: number;
      actual: number;
      isIncident?: boolean;
      score: number;
      weight: number;
    }>;
    const total = allParams.length;
    const reportedParams = allParams.filter((p) => p.isIncident || !(p.target === 0 && p.actual === 0));
    const reported = reportedParams.length;

    const reportedMaxPoints = reportedParams.reduce((sum, p) => sum + p.weight, 0);
    const reportedAchievedPoints = reportedParams.reduce((sum, p) => sum + (p.score * p.weight) / 100, 0);
    const adjustedPercentage = reportedMaxPoints > 0 ? (reportedAchievedPoints / reportedMaxPoints) * 100 : null;

    return { reported, total, adjustedPercentage };
  })();

  const handleExportPdf = () => {
    if (!dataSourceInfo) return;
    exportDashboardToPdf({
      siteLabel: dataSourceInfo.label,
      month: selectedMonth,
      year: selectedYear,
      totalScore: cumulativeScore.totalScore,
      maxScore: cumulativeScore.maxScore,
      rating: cumulativeScore.rating,
      displayData,
      isAmbiguousSource: dataSourceInfo.isAmbiguous,
    });
  };

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
        {/* Header with Import/Export Buttons */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Safety Dashboard</h1>
            <p className="text-gray-600 mt-1">Track and monitor safety metrics across all sites</p>
          </div>
          <div className="flex items-center gap-2">
            {!metricsLoading && metricsData && metricsData.length > 0 && (
              <Button variant="outline" onClick={handleExportPdf} className="gap-2">
                <FileDown className="w-4 h-4" />
                Export PDF
              </Button>
            )}
            {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
              <Button onClick={() => navigate('/import')} className="gap-2">
                <Upload className="w-4 h-4" />
                Import from Excel
              </Button>
            )}
          </div>
        </div>

        {/* Data Source Label */}
        {!metricsLoading && dataSourceInfo && (
          <div
            className={`rounded-lg border px-4 py-2 text-sm flex items-center gap-2 ${
              dataSourceInfo.isAmbiguous
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            {dataSourceInfo.isAmbiguous ? (
              <>
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>
                  Showing <strong>{dataSourceInfo.label}</strong> only — {dataSourceInfo.otherCount} other
                  site{dataSourceInfo.otherCount > 1 ? 's' : ''} also {dataSourceInfo.otherCount > 1 ? 'have' : 'has'} data
                  for this period and {dataSourceInfo.otherCount > 1 ? "aren't" : "isn't"} included here. Select a
                  specific site to see it.
                </span>
              </>
            ) : (
              <>
                <Building2 className="w-4 h-4 flex-shrink-0" />
                <span>
                  Showing data for <strong>{dataSourceInfo.label}</strong>
                </span>
              </>
            )}
          </div>
        )}

        {/* Data Completeness Notice */}
        {!metricsLoading && dataCompleteness && dataCompleteness.reported < dataCompleteness.total && (
          <div className="rounded-lg border px-4 py-2 text-sm flex items-center gap-2 bg-gray-50 border-gray-200 text-gray-600">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>
              {dataCompleteness.reported} of {dataCompleteness.total} parameters reported for this period —
              the rest show as <strong>Not Reported</strong>, not a poor score.
              {dataCompleteness.adjustedPercentage !== null && (
                <>
                  {' '}
                  For context, the official score above counts unreported parameters as 0 out of{' '}
                  {cumulativeScore.maxScore}; scored only against what was actually reported, it would read{' '}
                  <strong>{dataCompleteness.adjustedPercentage.toFixed(1)}%</strong>.
                </>
              )}
            </span>
          </div>
        )}

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

        {/* PPE Compliance */}
        {!metricsLoading && enabledCategories.ppe && displayData.ppe.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 bg-yellow-500 rounded" />
              <h2 className="text-xl font-bold">PPE Compliance</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayData.ppe.map((param, idx) => (
                <ParameterCard key={idx} {...param} />
              ))}
            </div>
          </section>
        )}

        {/* Environment Metrics */}
        {!metricsLoading && enabledCategories.environment && displayData.environment.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 bg-green-500 rounded" />
              <h2 className="text-xl font-bold">Environment Metrics</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayData.environment.map((param, idx) => (
                <ParameterCard key={idx} {...param} />
              ))}
            </div>
          </section>
        )}

        {/* Health & Hygiene */}
        {!metricsLoading && enabledCategories.health && displayData.health.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 bg-pink-500 rounded" />
              <h2 className="text-xl font-bold">Health & Hygiene</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayData.health.map((param, idx) => (
                <ParameterCard key={idx} {...param} />
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
