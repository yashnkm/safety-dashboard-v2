import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Users, Clock, AlertTriangle, FileWarning } from 'lucide-react';

interface KPIData {
  manDays: number;
  safeWorkHours: number;
  lostTimeInjuries: number;
  nearMissReports: number;
}

interface KPICardsProps {
  data?: KPIData;
  loading?: boolean;
}

export default function KPICards({ data, loading }: KPICardsProps) {
  // Default data for development
  const kpiData = data || {
    manDays: 0,
    safeWorkHours: 0,
    lostTimeInjuries: 0,
    nearMissReports: 0,
  };

  const cards = [
    {
      title: 'Man Days',
      value: kpiData.manDays.toLocaleString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Safe Work Hours',
      value: kpiData.safeWorkHours.toLocaleString(),
      icon: Clock,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Lost Time Injuries',
      value: kpiData.lostTimeInjuries.toLocaleString(),
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      title: 'Near Miss Reports',
      value: kpiData.nearMissReports.toLocaleString(),
      icon: FileWarning,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-10 w-10 bg-gray-200 rounded-lg" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-gray-200 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {card.title}
              </CardTitle>
              <div className={`p-2 ${card.bgColor} rounded-lg`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${card.color}`}>
                {card.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
