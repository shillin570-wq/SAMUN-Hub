import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

interface ChartItem {
  name: string;
  value: number;
  color?: string;
}

interface VotingResultChartsProps {
  pieData: ChartItem[];
  barData: ChartItem[];
  passed: boolean;
}

export function VotingResultCharts({ pieData, barData, passed }: VotingResultChartsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="apple-panel border-0 stage-entrance-delay">
        <CardHeader>
          <CardTitle className="text-base">票型占比</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4} dataKey="value">
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="apple-panel border-0 stage-entrance-delay">
        <CardHeader>
          <CardTitle className="text-base">票数统计</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.35)" />
              <XAxis dataKey="name" stroke="rgba(71, 85, 105, 0.85)" />
              <YAxis stroke="rgba(71, 85, 105, 0.85)" />
              <Tooltip separator="：" />
              <Bar dataKey="value" name="数量" fill={passed ? '#059669' : '#9f4f59'} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
