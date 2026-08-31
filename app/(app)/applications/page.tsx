import Link from 'next/link';
import ApplicationsTable from '@/components/ApplicationsTable';
import { getActiveApplications } from '@/lib/applications';
import type { Application } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ApplicationsPage() {
  let applications: Application[] = [];
  let loadError: string | null = null;
  try {
    applications = await getActiveApplications();
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'Failed to load applications.';
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Applications</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/applications/import"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Import from Excel
          </Link>
          <Link
            href="/applications/new"
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add application
          </Link>
        </div>
      </div>
      {loadError ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      ) : (
        <ApplicationsTable
          applications={applications}
          emptyMessage="No active applications yet. Add your first one."
        />
      )}
    </section>
  );
}
