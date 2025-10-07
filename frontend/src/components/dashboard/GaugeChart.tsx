import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GaugeChartProps {
  value: number;
  max: number;
  title: string;
  subtitle?: string;
}

export default function GaugeChart({ value, max, title, subtitle }: GaugeChartProps) {
  const percentage = (value / max) * 100;

  // Color based on performance: 0-30 (LOW/Red), 30-70 (MEDIUM/Yellow), 70-100 (HIGH/Green)
  const getColor = (pct: number) => {
    if (pct >= 70) return '#10b981'; // green - HIGH
    if (pct >= 30) return '#f59e0b'; // yellow - MEDIUM
    return '#ef4444'; // red - LOW
  };

  const color = getColor(percentage);

  // Calculate needle rotation angle (-90deg to +90deg for 180° arc)
  const needleAngle = (percentage / 100) * 180 - 90;

  return (
    <Card className="border-0 shadow-lg h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-700">
          {title}
        </CardTitle>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col items-center py-6">
        {/* Gauge SVG */}
        <div className="relative w-64 h-32 mb-4 flex items-center justify-center">
          <svg width="256" height="128" viewBox="0 0 256 128" className="overflow-visible">
            {/* Background Arc (Gray) */}
            <path
              d="M 28 128 A 100 100 0 0 1 228 128"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="24"
              strokeLinecap="round"
            />

            {/* Colored Arc (Progress) */}
            <path
              d="M 28 128 A 100 100 0 0 1 228 128"
              fill="none"
              stroke={color}
              strokeWidth="24"
              strokeLinecap="round"
              strokeDasharray={`${(percentage / 100) * 314.159} 314.159`}
            />

            {/* Needle */}
            <g transform={`translate(128, 128) rotate(${needleAngle})`}>
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="-70"
                stroke="#374151"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="0" cy="0" r="6" fill="#374151" />
              <circle cx="0" cy="-70" r="4" fill="#374151" />
            </g>
          </svg>
        </div>

        {/* Stats Grid: Benchmark / Achieved / Gap */}
        <div className="grid grid-cols-3 gap-6 w-full pt-6 mt-4 border-t">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Benchmark</p>
            <p className="text-4xl font-bold text-gray-900">{max}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Achieved</p>
            <p className="text-4xl font-bold" style={{ color }}>{value.toFixed(1)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Gap</p>
            <p className="text-4xl font-bold text-gray-900">{(max - value).toFixed(1)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
