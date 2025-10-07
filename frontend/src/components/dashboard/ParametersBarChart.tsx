import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ParameterData {
  name: string;
  percentage: number;
}

interface ParametersBarChartProps {
  data: ParameterData[];
  title: string;
  subtitle?: string;
}

// Custom tooltip
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percentage = data.percentage;

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="font-semibold text-gray-900 mb-2">{data.name}</p>
        <p className={`text-sm font-semibold ${
          percentage >= 90 ? 'text-green-600' :
          percentage >= 70 ? 'text-yellow-600' :
          'text-red-600'
        }`}>
          Achievement: {percentage.toFixed(1)}%
        </p>
      </div>
    );
  }
  return null;
};

// Get bar color based on percentage
const getBarColor = (percentage: number) => {
  if (percentage >= 90) return '#10b981'; // green
  if (percentage >= 70) return '#f59e0b'; // yellow
  return '#ef4444'; // red
};

export default function ParametersBarChart({ data, title, subtitle }: ParametersBarChartProps) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-700">{title}</CardTitle>
        {subtitle && (
          <p className="text-sm text-gray-500">{subtitle}</p>
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
            <Bar
              dataKey="percentage"
              radius={[8, 8, 0, 0]}
              name="Achievement %"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.percentage)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
