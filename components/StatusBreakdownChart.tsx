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
import type { StatusCount } from '@/lib/stats';
import { useDarkMode } from '@/lib/useDarkMode';

export default function StatusBreakdownChart({ data }: { data: StatusCount[] }) {
  const isDark = useDarkMode();
  const tickColor = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? '#374151' : '#e5e7eb';

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
        <XAxis
          dataKey="status"
          fontSize={11}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={60}
          tick={{ fill: tickColor }}
        />
        <YAxis allowDecimals={false} fontSize={12} tick={{ fill: tickColor }} />
        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? '#1f2937' : '#fff',
            borderColor: isDark ? '#374151' : '#e5e7eb',
            color: isDark ? '#f3f4f6' : '#111827',
          }}
          labelStyle={{ color: isDark ? '#f3f4f6' : '#111827' }}
          itemStyle={{ color: isDark ? '#f3f4f6' : '#111827' }}
        />
        <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
