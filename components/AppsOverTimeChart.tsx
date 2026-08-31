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

export default function AppsOverTimeChart({ data }: { data: DayCount[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-400">No applications yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" tickFormatter={formatDate} fontSize={12} />
        <YAxis allowDecimals={false} fontSize={12} />
        <Tooltip labelFormatter={(label) => formatDate(String(label))} />
        <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
