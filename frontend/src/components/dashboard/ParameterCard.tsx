import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';
import MiniDonut from './MiniDonut.tsx';

interface ParameterCardProps {
  title: string;
  icon: LucideIcon;
  target: number;
  actual: number;
  score: number;
  weight: number; // This parameter's max points out of the 100-point total
  unit?: string;
  isIncident?: boolean; // For incidents, lower actual is better
  // Achievement-point change vs the previous month. Only supplied in Monthly
  // view (combined periods have no clean "previous"), so its presence alone
  // controls whether the trend row renders.
  trend?: { delta: number };
}

export default function ParameterCard({
  title,
  icon: Icon,
  target,
  actual,
  score,
  weight,
  unit = '',
  isIncident = false,
  trend,
}: ParameterCardProps) {
  // How many of this parameter's points were actually earned toward the
  // 100-point total — distinct from "Achievement", which is just this
  // parameter's own ratio and says nothing about how much it matters.
  const pointsEarned = (score * weight) / 100;

  // Target=0 with actual=0 means this field was never filled in for this
  // period — not a genuinely bad result. Incident parameters don't have
  // this ambiguity (target=0 is their design, actual=0 is a real "zero
  // incidents" outcome), so they're excluded here.
  const isNotReported = !isIncident && target === 0 && actual === 0;

  // Determine status based on score
  const getStatus = () => {
    if (isNotReported) return { label: 'Not Reported', color: 'bg-gray-100 text-gray-500 border-gray-300' };
    if (score >= 90) return { label: 'Excellent', color: 'bg-green-100 text-green-700 border-green-300' };
    if (score >= 70) return { label: 'Good', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' };
    return { label: 'Needs Attention', color: 'bg-red-100 text-red-700 border-red-300' };
  };

  const status = getStatus();

  const achievement = isNotReported ? 0 : Math.min(Math.max(score, 0), 100);

  // Ring / accent color as a raw hex so the SVG donut and the points figure
  // stay in lockstep with the status badge above.
  const getAccentColor = () => {
    if (isNotReported) return '#9ca3af'; // gray-400
    if (score >= 90) return '#16a34a'; // green-600
    if (score >= 70) return '#ca8a04'; // yellow-600
    return '#dc2626'; // red-600
  };
  const accent = getAccentColor();

  const formatNumber = (num: number) => num.toLocaleString();

  // Gap = Target − Actual, labelled by direction. For incidents (target 0,
  // a positive actual) this reads as "N over target", which is correct.
  const gap = target - actual;
  const gapLabel =
    gap === 0 ? 'On target' : gap > 0 ? `${formatNumber(gap)} ${unit} short of target` : `${formatNumber(-gap)} ${unit} over target`;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </div>
          <Badge variant="outline" className={status.color}>
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Donut focal point + Achievement label */}
        <div className="flex items-center gap-4">
          <MiniDonut percentage={achievement} color={accent} notReported={isNotReported} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Achievement</p>
            <p className="text-2xl font-bold" style={{ color: isNotReported ? '#9ca3af' : accent }}>
              {isNotReported ? '—' : `${score.toFixed(1)}%`}
            </p>
            {/* Trend vs last month (Monthly view only) */}
            {trend && !isNotReported && (
              <div className="mt-0.5 flex items-center gap-1 text-xs">
                {trend.delta > 0.05 ? (
                  <>
                    <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-green-600 font-medium">{trend.delta.toFixed(1)}%</span>
                  </>
                ) : trend.delta < -0.05 ? (
                  <>
                    <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                    <span className="text-red-600 font-medium">{Math.abs(trend.delta).toFixed(1)}%</span>
                  </>
                ) : (
                  <>
                    <Minus className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-gray-400 font-medium">0.0%</span>
                  </>
                )}
                <span className="text-muted-foreground">vs last month</span>
              </div>
            )}
          </div>
        </div>

        {/* Target vs Actual */}
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div>
            <p className="text-xs text-muted-foreground">Target</p>
            <p className="text-lg font-bold">
              {formatNumber(target)} {unit}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Actual</p>
            <p className="text-lg font-bold">
              {formatNumber(actual)} {unit}
            </p>
          </div>
        </div>

        {/* Gap (Target − Actual) */}
        {!isNotReported && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Gap</span>
            <span className={`font-medium ${gap < 0 && isIncident ? 'text-red-600' : gap > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {gapLabel}
            </span>
          </div>
        )}

        {/* Weighted contribution to the 100-point total */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-600">Weighted score</span>
            <span className="text-[11px] text-muted-foreground">toward the 100-pt total</span>
          </div>
          <span className={`text-xl font-bold`} style={{ color: isNotReported ? '#9ca3af' : accent }}>
            {pointsEarned.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">/ {weight} pts</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
