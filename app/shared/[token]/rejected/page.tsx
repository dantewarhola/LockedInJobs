import { notFound } from 'next/navigation';
import RejectedApplicationsView from '@/components/RejectedApplicationsView';
import { filterRejected, getSharedDashboardData } from '@/lib/shared';

export const dynamic = 'force-dynamic';

export default async function SharedRejectedPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getSharedDashboardData(token);
  if (!data) notFound();

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Rejected</h1>
      <RejectedApplicationsView applications={filterRejected(data.applications)} readOnly />
    </section>
  );
}
