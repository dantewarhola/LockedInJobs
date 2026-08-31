import { CLOSED_STATUSES, STATUS_VALUES, type Application, type Status } from './types';

export interface Rate {
  count: number;
  rate: number;
}

export interface DayCount {
  day: string; // 'YYYY-MM-DD'
  count: number;
}

export interface StatusCount {
  status: Status;
  count: number;
}

export interface DashboardStats {
  total: number;
  open: number;
  interviews: Rate;
  offers: Rate;
  rejections: Rate;
  avgSalary: number | null;
  overTime: DayCount[];
  statusBreakdown: StatusCount[];
}

const rate = (count: number, total: number): Rate => ({
  count,
  rate: total === 0 ? 0 : count / total,
});

export function computeStats(apps: Application[]): DashboardStats {
  const total = apps.length;
  const count = (predicate: (a: Application) => boolean) => apps.filter(predicate).length;

  const open = count((a) => !CLOSED_STATUSES.includes(a.status));
  const interviews = count((a) => a.status === 'Interview' || a.status === 'Offer');
  const offers = count((a) => a.status === 'Offer');
  const rejections = count((a) => a.status === 'Rejected');

  const withSalary = apps.filter((a) => a.salary_min !== null && a.salary_max !== null);
  const avgSalary =
    withSalary.length === 0
      ? null
      : Math.round(
          withSalary.reduce(
            (sum, a) => sum + ((a.salary_min as number) + (a.salary_max as number)) / 2,
            0,
          ) / withSalary.length,
        );

  const dayMap = new Map<string, number>();
  for (const a of apps) {
    const day = a.application_date.slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }
  const overTime: DayCount[] = [...dayMap.entries()]
    .map(([day, c]) => ({ day, count: c }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const statusBreakdown: StatusCount[] = STATUS_VALUES.map((status) => ({
    status,
    count: count((a) => a.status === status),
  }));

  return {
    total,
    open,
    interviews: rate(interviews, total),
    offers: rate(offers, total),
    rejections: rate(rejections, total),
    avgSalary,
    overTime,
    statusBreakdown,
  };
}
