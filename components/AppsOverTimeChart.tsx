'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDate } from '@/lib/format';
import type { DayCount } from '@/lib/stats';
import { useDarkMode } from '@/lib/useDarkMode';

export default function AppsOverTimeChart({ data }: { data: DayCount[] }) {
  const isDark = useDarkMode();
  const tickColor = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? '#374151' : '#e5e7eb';

  if (data.length === 0) {
    return <p className="text-sm text-gray-400">No applications yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
        <XAxis dataKey="day" tickFormatter={formatDate} fontSize={12} tick={{ fill: tickColor }} />
        <YAxis allowDecimals={false} fontSize={12} tick={{ fill: tickColor }} />
        <Tooltip
          labelFormatter={(label) => formatDate(String(label))}
          contentStyle={{
            backgroundColor: isDark ? '#1f2937' : '#fff',
            borderColor: isDark ? '#374151' : '#e5e7eb',
            color: isDark ? '#f3f4f6' : '#111827',
          }}
          labelStyle={{ color: isDark ? '#f3f4f6' : '#111827' }}
          itemStyle={{ color: isDark ? '#f3f4f6' : '#111827' }}
        />
        <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
