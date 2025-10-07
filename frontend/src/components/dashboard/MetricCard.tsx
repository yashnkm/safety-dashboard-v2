import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  progress?: number;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: string;
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'error';
  };
}

export default function MetricCard({
  title,
  value,
  subtitle,
  progress,
  icon: Icon,
  trend,
  badge
}: MetricCardProps) {
  const getProgressColor = (pct: number) => {
    if (pct >= 90) return 'bg-green-500';
    if (pct >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getBadgeColor = (variant: string) => {
    if (variant === 'success') return 'bg-green-50 text-green-700 border-green-200';
    if (variant === 'warning') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  return (
    <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
              {trend && (
                <span className={`text-sm font-medium ${
                  trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {trend}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          {Icon && (
            <div className="p-2 bg-gray-100 rounded-lg">
              <Icon className="w-5 h-5 text-gray-600" />
            </div>
          )}
        </div>

        {progress !== undefined && (
          <div className="space-y-2">
            <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`absolute left-0 top-0 h-full ${getProgressColor(progress)} transition-all duration-500`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}

        {badge && (
          <div className="mt-3">
            <Badge className={`${getBadgeColor(badge.variant)} border`}>
              {badge.text}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
