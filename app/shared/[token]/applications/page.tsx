import { notFound } from 'next/navigation';
import OpenApplicationsView from '@/components/OpenApplicationsView';
import { daysInCurrentStage } from '@/lib/metrics';
import { filterActive, getSharedDashboardData } from '@/lib/shared';

export const dynamic = 'force-dynamic';

export default async function SharedApplicationsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getSharedDashboardData(token);
  if (!data) notFound();

  const active = filterActive(data.applications);
  const now = new Date();
  const stageDays = Object.fromEntries(
    active.map((a) => [a.id, daysInCurrentStage(a, data.events, now)]),
  );

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Applications</h1>
      <OpenApplicationsView applications={active} stageDays={stageDays} readOnly />
    </section>
  );
}
