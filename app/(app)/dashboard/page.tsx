import AppsOverTimeChart from '@/components/AppsOverTimeChart';
import SankeyFlow from '@/components/SankeyFlow';
import StatCard from '@/components/StatCard';
import StatusBreakdownChart from '@/components/StatusBreakdownChart';
import { getAllApplications } from '@/lib/applications';
import { computeFlow } from '@/lib/flow';
import { formatPercent, formatUSD } from '@/lib/format';
import { computeStats } from '@/lib/stats';
import type { Application } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let applications: Application[] = [];
  let loadError: string | null = null;
  try {
    applications = await getAllApplications();
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'Failed to load dashboard.';
  }

  if (loadError) {
    return (
      <section className="space-y-4">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {loadError}
        </p>
      </section>
    );
  }

  const stats = computeStats(applications);

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
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Applications over time</h2>
          <AppsOverTimeChart data={stats.overTime} />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Status breakdown</h2>
          <StatusBreakdownChart data={stats.statusBreakdown} />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Application flow</h2>
        <SankeyFlow data={computeFlow(applications)} />
      </div>
    </section>
  );
}
