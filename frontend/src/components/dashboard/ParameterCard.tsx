import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { type LucideIcon } from 'lucide-react';

interface ParameterCardProps {
  title: string;
  icon: LucideIcon;
  target: number;
  actual: number;
  score: number;
  weight: number; // This parameter's max points out of the 100-point total
  unit?: string;
  isIncident?: boolean; // For incidents, lower actual is better
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

  // The progress bar mirrors the backend-computed `score` directly, rather
  // than re-deriving its own answer from target/actual/isIncident — that
  // duplicated logic used to drift out of sync whenever the backend's
  // scoring rules changed (e.g. leading indicators no longer decaying for
  // a non-zero count), showing a 0% bar next to a 100% achievement label.
  const progressPercentage = isNotReported ? 0 : Math.min(Math.max(score, 0), 100);

  // Determine progress bar color
  const getProgressColor = () => {
    if (isNotReported) return 'bg-gray-300';
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
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
        {/* Target vs Actual */}
        <div className="grid grid-cols-2 gap-4">
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

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Achievement</span>
            <span className="font-medium">{isNotReported ? '—' : `${score.toFixed(1)}%`}</span>
          </div>
          <div className="relative w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`absolute left-0 top-0 h-full ${getProgressColor()} transition-all duration-300`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Weighted Contribution to the 100-point total */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">Contributes to Total</span>
          <span className={`text-xl font-bold ${isNotReported ? 'text-gray-400' : score >= 90 ? 'text-green-600' : score >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
            {pointsEarned.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">/ {weight} pts</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
