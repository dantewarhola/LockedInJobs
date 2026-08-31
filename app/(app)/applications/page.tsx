import Link from 'next/link';
import OpenApplicationsView from '@/components/OpenApplicationsView';
import { getActiveApplications } from '@/lib/applications';
import { getAllApplicationEvents } from '@/lib/events';
import { daysInCurrentStage } from '@/lib/metrics';
import type { Application } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ApplicationsPage() {
  let applications: Application[] = [];
  let stageDays: Record<string, number> = {};
  let loadError: string | null = null;
  try {
    const [apps, events] = await Promise.all([getActiveApplications(), getAllApplicationEvents()]);
    applications = apps;
    const now = new Date();
    stageDays = Object.fromEntries(
      apps.map((a) => [a.id, daysInCurrentStage(a, events, now)]),
    );
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'Failed to load applications.';
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Applications</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/applications/import"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
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
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {loadError}
        </p>
      ) : (
        <OpenApplicationsView applications={applications} stageDays={stageDays} />
      )}
    </section>
  );
}
