import { notFound } from 'next/navigation';
import AppsOverTimeChart from '@/components/AppsOverTimeChart';
import SankeyFlow from '@/components/SankeyFlow';
import StatCard from '@/components/StatCard';
import StatusBreakdownChart from '@/components/StatusBreakdownChart';
import StreakCard from '@/components/StreakCard';
import WeeklyGoalBar from '@/components/WeeklyGoalBar';
import { computeFlow } from '@/lib/flow';
import { formatPercent, formatUSD } from '@/lib/format';
import { streak, weeklyProgress } from '@/lib/metrics';
import { getSharedDashboardData } from '@/lib/shared';
import { computeStats } from '@/lib/stats';

export const dynamic = 'force-dynamic';

const cardClass =
  'rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900';
const cardHeading = 'mb-2 text-sm font-medium text-gray-700 dark:text-gray-300';

export default async function SharedDashboardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getSharedDashboardData(token);
  if (!data) notFound();

  const { applications, weeklyGoal } = data;
  const stats = computeStats(applications);
  const now = new Date();
  const weekly = weeklyProgress(applications, now, weeklyGoal);
  const streakStats = streak(applications, now);

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total applications" value={String(stats.total)} />
        <StatCard label="Open positions" value={String(stats.open)} />
        <StatCard
          label="Interviews"
          value={String(stats.interviews.count)}
          sub={`${formatPercent(stats.interviews.rate)} of total`}
        />
        <StatCard
          label="Offers"
          value={String(stats.offers.count)}
          sub={`${formatPercent(stats.offers.rate)} of total`}
        />
        <StatCard
          label="Rejections"
          value={String(stats.rejections.count)}
          sub={`${formatPercent(stats.rejections.rate)} of total`}
        />
        <StatCard label="Avg salary" value={formatUSD(stats.avgSalary)} sub="midpoint of ranges" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <WeeklyGoalBar count={weekly.count} goal={weekly.goal} pct={weekly.pct} />
        <StreakCard current={streakStats.current} longest={streakStats.longest} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className={cardClass}>
          <h2 className={cardHeading}>Applications over time</h2>
          <AppsOverTimeChart data={stats.overTime} />
        </div>
        <div className={cardClass}>
          <h2 className={cardHeading}>Status breakdown</h2>
          <StatusBreakdownChart data={stats.statusBreakdown} />
        </div>
      </div>

      <div className={cardClass}>
        <h2 className={cardHeading}>Application flow</h2>
        <SankeyFlow data={computeFlow(applications)} />
      </div>
    </section>
  );
}
