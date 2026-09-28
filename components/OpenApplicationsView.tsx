'use client';

import { useMemo, useState } from 'react';
import ApplicationsTable from './ApplicationsTable';
import { applicationsToCSV } from '@/lib/csv';
import { filterApplications } from '@/lib/search';
import { sortApplications, type SortDirection, type SortKey } from '@/lib/sort';
import type { Application } from '@/lib/types';

const searchInputClass =
  'w-full max-w-sm rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100';

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function OpenApplicationsView({
  applications,
  stageDays,
}: {
  applications: Application[];
  stageDays: Record<string, number>;
}) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const filtered = useMemo(() => filterApplications(applications, query), [applications, query]);
  const sorted = useMemo(
    () => (sortKey ? sortApplications(filtered, sortKey, sortDirection, stageDays) : filtered),
    [filtered, sortKey, sortDirection, stageDays],
  );
  const searching = query.trim().length > 0;

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }

  function handleExport() {
    const csv = applicationsToCSV(sorted, stageDays);
    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `applications-${date}.csv`);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by company, title, or location"
          aria-label="Search applications"
          className={searchInputClass}
        />
        <button
          type="button"
          onClick={handleExport}
          disabled={sorted.length === 0}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          Export CSV
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {searching
          ? `${filtered.length} of ${applications.length} shown`
          : `${applications.length} open application${applications.length === 1 ? '' : 's'}.`}
      </p>
      <ApplicationsTable
        applications={sorted}
        stageDays={stageDays}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={handleSort}
        emptyMessage={
          searching
            ? `No applications match "${query.trim()}".`
            : 'No active applications yet. Add your first one.'
        }
      />
    </div>
  );
}
