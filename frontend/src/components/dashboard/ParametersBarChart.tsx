import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ParameterData {
  name: string;
  percentage: number;
  notReported?: boolean;
}

interface ParametersBarChartProps {
  data: ParameterData[];
  title: string;
  subtitle?: string;
  // Company-configurable status label cutoffs (Achievement %). Default 90/70.
  excellentAt?: number;
  goodAt?: number;
}

// Get bar color based on percentage and the company's status cutoffs
const getBarColor = (percentage: number, excellentAt: number, goodAt: number) => {
  if (percentage >= excellentAt) return '#10b981'; // green
  if (percentage >= goodAt) return '#f59e0b'; // yellow
  return '#ef4444'; // red
};

export default function ParametersBarChart({
  data,
  title,
  subtitle,
  excellentAt = 90,
  goodAt = 70,
}: ParametersBarChartProps) {
  const hasNotReported = data.some((d) => d.notReported);

  // Custom tooltip — closes over the company cutoffs for the colour band.
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;

      if (d.notReported) {
        return (
          <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
            <p className="font-semibold text-gray-900 mb-1">{d.name}</p>
            <p className="text-sm font-medium text-gray-500">Not Reported — no data entered</p>
          </div>
        );
      }

      const percentage = d.percentage;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">{d.name}</p>
          <p className={`text-sm font-semibold ${
            percentage >= excellentAt ? 'text-green-600' :
            percentage >= goodAt ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            Achievement: {percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom bar: normal coloured bar for reported params; for "not reported"
  // params (which would otherwise be an invisible 0% bar, indistinguishable
  // from a genuine failure) draw a small grey marker at the baseline instead.
  const renderBar = (props: any) => {
    const { x, y, width, height, payload } = props;
    if (payload.notReported) {
      const stub = 6;
      return <rect x={x} y={y - stub} width={width} height={stub} fill="#d1d5db" rx={1} />;
    }
    return <rect x={x} y={y} width={width} height={height} rx={4} ry={4} fill={getBarColor(payload.percentage, excellentAt, goodAt)} />;
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-700">{title}</CardTitle>
        {subtitle && (
          <p className="text-sm text-gray-500">{subtitle}</p>
        )}
        {hasNotReported && (
          <p className="text-xs text-gray-400 mt-1">
            <span className="inline-block w-3 h-2 align-middle rounded-sm mr-1" style={{ backgroundColor: '#d1d5db' }} />
            Grey marker = not reported this period (distinct from a scored 0%).
          </p>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              label={{ value: 'Achievement %', angle: -90, position: 'insideLeft' }}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="percentage" name="Achievement %" shape={renderBar} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
