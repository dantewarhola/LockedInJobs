'use client';

import { useMemo, useState } from 'react';
import RejectedTable from './RejectedTable';
import { filterApplications } from '@/lib/search';
import type { Application } from '@/lib/types';

const searchInputClass =
  'w-full max-w-sm rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100';

export default function RejectedApplicationsView({
  applications,
}: {
  applications: Application[];
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => filterApplications(applications, query), [applications, query]);
  const searching = query.trim().length > 0;

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by company, title, or location"
        aria-label="Search rejected applications"
        className={searchInputClass}
      />
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {searching
          ? `${filtered.length} of ${applications.length} shown`
          : `${applications.length} rejected application${applications.length === 1 ? '' : 's'}.`}
      </p>
      <RejectedTable
        applications={filtered}
        emptyMessage={
          searching ? `No applications match "${query.trim()}".` : undefined
        }
      />
    </div>
  );
}
