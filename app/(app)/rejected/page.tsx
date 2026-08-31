import RejectedTable from '@/components/RejectedTable';
import { getRejectedApplications } from '@/lib/applications';
import type { Application } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function RejectedPage() {
  let applications: Application[] = [];
  let loadError: string | null = null;
  try {
    applications = await getRejectedApplications();
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'Failed to load rejected applications.';
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Rejected</h1>
      {loadError ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            {applications.length} rejected application{applications.length === 1 ? '' : 's'}.
          </p>
          <RejectedTable applications={applications} />
        </>
      )}
    </section>
  );
}
