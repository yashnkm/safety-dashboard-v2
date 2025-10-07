import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MonthlyData {
  month: string;
  score: number;
  target: number;
}

interface MonthlyTrendChartProps {
  data: MonthlyData[];
  currentMonth?: string;
  year: number;
}

export default function MonthlyTrendChart({ data, year }: MonthlyTrendChartProps) {
  // Calculate statistics
  const scores = data.map(d => d.score).filter(s => s > 0);
  const currentScore = scores.length > 0 ? scores[scores.length - 1] : 0;
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const bestMonth = data.reduce((max, item) => item.score > max.score ? item : max, data[0]);

  // Calculate trend
  const recentScores = scores.slice(-3); // Last 3 months
  const trend = recentScores.length >= 2
    ? ((recentScores[recentScores.length - 1] - recentScores[0]) / recentScores[0]) * 100
    : 0;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-sm mb-1">{data.month}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Score: </span>
            <span className="font-bold text-primary">{data.score.toFixed(1)}</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Target: </span>
            <span className="font-bold">{data.target}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Get color based on score range
  const getScoreColor = (score: number) => {
    if (score >= 70) return '#10b981'; // green
    if (score >= 30) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  return (
    <Card className="border-0 shadow-lg h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-700">
          Monthly Performance Trend - {year}
        </CardTitle>
        <p className="text-sm text-muted-foreground">Track safety score progression throughout the year</p>
      </CardHeader>
      <CardContent className="py-6">
        {/* Chart */}
        <div className="h-56 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                </linearGradient>
              </defs>

              {/* Background zones */}
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

              {/* Axes */}
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
                label={{ value: 'Score', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              />

              {/* Reference lines for thresholds */}
              <ReferenceLine y={70} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.5} />
              <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
              <ReferenceLine y={100} stroke="#6b7280" strokeDasharray="3 3" label={{ value: 'Target', fontSize: 10, fill: '#6b7280' }} />

              {/* Tooltip */}
              <Tooltip content={<CustomTooltip />} />

              {/* Area and Line */}
              <Area
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                strokeWidth={3}
                fill="url(#scoreGradient)"
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6, fill: '#2563eb' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Current</p>
            <p className="text-xl font-bold" style={{ color: getScoreColor(currentScore) }}>
              {currentScore.toFixed(1)}
            </p>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Year Avg</p>
            <p className="text-xl font-bold text-gray-900">
              {avgScore.toFixed(1)}
            </p>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Best Month</p>
            <p className="text-xl font-bold text-green-600">
              {bestMonth?.score.toFixed(1) || '0.0'}
            </p>
            <p className="text-xs text-muted-foreground">({bestMonth?.month || 'N/A'})</p>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Trend</p>
            <div className="flex items-center justify-center gap-1">
              {trend >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <p className={`text-xl font-bold ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
