'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { StageDwell } from '@/lib/metrics';

export default function StageDwellChart({ data }: { data: StageDwell[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-400">Not enough history yet.</p>;
  }

  const rows = data.map((d) => ({
    stage: d.stage,
    days: Math.round(d.medianDays * 10) / 10,
    count: d.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart layout="vertical" data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" fontSize={12} allowDecimals />
        <YAxis type="category" dataKey="stage" fontSize={11} width={110} />
        <Tooltip
          formatter={(value, _name, item) => [
            `${value as number} days (${(item?.payload as { count?: number })?.count ?? 0} applications)`,
            'Median',
          ]}
        />
        <Bar dataKey="days" fill="#2563eb" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
