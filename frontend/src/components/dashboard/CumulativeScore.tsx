import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { TrendingUp, Award } from 'lucide-react';

interface CumulativeScoreProps {
  totalScore: number;
  maxScore: number;
  rating: 'LOW' | 'MEDIUM' | 'HIGH';
  parameterStats?: {
    targetMet: number;
    close: number;
    below: number;
  };
}

export default function CumulativeScore({ totalScore, maxScore, rating, parameterStats }: CumulativeScoreProps) {
  const percentage = (totalScore / maxScore) * 100;

  // Use provided stats or calculate defaults
  const stats = parameterStats || {
    targetMet: 0,
    close: 0,
    below: 0,
  };

  const ratingConfig = {
    HIGH: { color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50', label: 'Excellent', icon: '⭐' },
    MEDIUM: { color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50', label: 'Good', icon: '⚠️' },
    LOW: { color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50', label: 'Needs Improvement', icon: '❌' },
  };

  const config = ratingConfig[rating];

  return (
    <Card className="border-2 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Overall Safety Performance Score
          </CardTitle>
          <Badge className={`${config.bgColor} ${config.textColor} border-0`}>
            {config.icon} {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Large Score Display */}
          <div className="text-center">
            <div className="text-5xl font-bold text-primary mb-2">
              {percentage.toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground">
              Achieved: {totalScore.toFixed(0)} / {maxScore} points
            </p>
          </div>

          {/* Progress Bar */}
          <div className="relative w-full h-6 bg-secondary rounded-full overflow-hidden">
            <div
              className={`absolute left-0 top-0 h-full ${config.color} transition-all duration-500 flex items-center justify-center text-xs font-medium text-white`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            >
              {percentage > 10 && `${percentage.toFixed(1)}%`}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-medium">Target Met</span>
              </div>
              <p className="text-2xl font-bold">{stats.targetMet}</p>
              <p className="text-xs text-muted-foreground">Parameters</p>
            </div>
            <div className="text-center border-x">
              <div className="flex items-center justify-center gap-1 text-yellow-600 mb-1">
                <span className="text-xs font-medium">⚠️ Close</span>
              </div>
              <p className="text-2xl font-bold">{stats.close}</p>
              <p className="text-xs text-muted-foreground">Parameters</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                <span className="text-xs font-medium">❌ Below</span>
              </div>
              <p className="text-2xl font-bold">{stats.below}</p>
              <p className="text-xs text-muted-foreground">Parameters</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
