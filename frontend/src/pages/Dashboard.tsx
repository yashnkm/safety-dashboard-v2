import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore.ts';
import DashboardLayout from '@/components/layout/DashboardLayout.tsx';
import KPICards from '@/components/dashboard/KPICards.tsx';
import Filters from '@/components/dashboard/Filters.tsx';
import { dashboardService } from '@/services/dashboard.service.ts';

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);

  // Filter state
  const currentDate = new Date();
  const [selectedSite, setSelectedSite] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(
    (currentDate.getMonth() + 1).toString().padStart(2, '0')
  );
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Fetch sites
  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: dashboardService.getSites,
  });

  // Fetch KPI data
  const {
    data: kpiData,
    isLoading: kpiLoading,
    refetch: refetchKPI,
  } = useQuery({
    queryKey: ['kpi', selectedSite, selectedMonth, selectedYear],
    queryFn: () =>
      dashboardService.getKPI({
        siteId: selectedSite !== 'all' ? selectedSite : undefined,
        month: selectedMonth,
        year: selectedYear,
      }),
  });

  // Refetch data when filters change
  useEffect(() => {
    refetchKPI();
  }, [selectedSite, selectedMonth, selectedYear, refetchKPI]);

  return (
    <DashboardLayout>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Safety Statistics Dashboard
        </h1>
        <p className="mt-2 text-gray-600">
          Welcome, {user?.fullName} • {user?.company.companyName} • {user?.role.replace('_', ' ')}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8">
        <Filters
          sites={sites}
          selectedSite={selectedSite}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onSiteChange={setSelectedSite}
          onMonthChange={setSelectedMonth}
          onYearChange={setSelectedYear}
          loading={sitesLoading}
        />
      </div>

      {/* KPI Cards */}
      <div className="mb-8">
        <KPICards data={kpiData} loading={kpiLoading} />
      </div>

      {/* Placeholder for additional sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Training Metrics</h2>
          <p className="text-gray-600">Charts will be displayed here</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Compliance Metrics</h2>
          <p className="text-gray-600">Charts will be displayed here</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Emergency & Audits</h2>
          <p className="text-gray-600">Charts will be displayed here</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Incident Reports</h2>
          <p className="text-gray-600">Charts will be displayed here</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
