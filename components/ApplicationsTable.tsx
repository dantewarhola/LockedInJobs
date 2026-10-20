import Link from 'next/link';
import DeleteButton from './DeleteButton';
import FavoriteButton from './FavoriteButton';
import StatusBadge from './StatusBadge';
import { formatDateFull, formatSalaryRange } from '@/lib/format';
import type { SortDirection, SortKey } from '@/lib/sort';
import type { Application } from '@/lib/types';

const SORTABLE_COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'company_name', label: 'Business' },
  { key: 'job_title', label: 'Title' },
  { key: 'location', label: 'Location' },
  { key: 'salary', label: 'Salary' },
  { key: 'application_date', label: 'Applied' },
  { key: 'status', label: 'Status' },
  { key: 'time', label: 'Time' },
];

function SortableHeader({
  columnKey,
  label,
  sortKey,
  sortDirection,
  onSort,
}: {
  columnKey: SortKey;
  label: string;
  sortKey: SortKey | null;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const active = sortKey === columnKey;
  return (
    <th className="px-2 py-2">
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className="flex items-center gap-1 text-left uppercase tracking-wide hover:text-gray-900 dark:hover:text-gray-100"
        aria-label={`Sort by ${label}`}
      >
        {label}
        <span className="text-[10px]" aria-hidden="true">
          {active ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </button>
    </th>
  );
}

export default function ApplicationsTable({
  applications,
  stageDays,
  emptyMessage,
  readOnly = false,
  sortKey = null,
  sortDirection = 'asc',
  onSort,
}: {
  applications: Application[];
  stageDays: Record<string, number>;
  emptyMessage: string;
  readOnly?: boolean;
  sortKey?: SortKey | null;
  sortDirection?: SortDirection;
  onSort?: (key: SortKey) => void;
}) {
  if (applications.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-gray-300 p-6 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <table className="w-full min-w-[720px] table-fixed divide-y divide-gray-200 text-sm dark:divide-gray-800">
        <colgroup>
          <col className="w-8" />
          <col className="w-[18%]" />
          <col className="w-[17%]" />
          <col className="w-[11%]" />
          <col className="w-[16%]" />
          <col className="w-[11%]" />
          <col className="w-[9%]" />
          <col className="w-[5%]" />
          <col className="w-[6%]" />
          <col className="w-[7%]" />
        </colgroup>
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          <tr>
            <th className="px-2 py-2">
              <span className="sr-only">Favorite</span>
            </th>
            {SORTABLE_COLUMNS.map(({ key, label }) =>
              onSort ? (
                <SortableHeader
                  key={key}
                  columnKey={key}
                  label={label}
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={onSort}
                />
              ) : (
                <th key={key} className="px-2 py-2">
                  {label}
                </th>
              ),
            )}
            <th className="px-2 py-2">Link</th>
            <th className="px-2 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {applications.map((a) => (
            <tr key={a.id}>
              <td className="px-2 py-2">
                {readOnly ? (
                  a.favorite && (
                    <svg
                      viewBox="0 0 20 20"
                      className="h-5 w-5 text-yellow-500"
                      aria-label="Favorited"
                    >
                      <path
                        d="M10 1.6l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.2l-4.95 2.6.94-5.5-4-3.9 5.53-.8L10 1.6z"
                        fill="currentColor"
                      />
                    </svg>
                  )
                ) : (
                  <FavoriteButton id={a.id} favorite={a.favorite} />
                )}
              </td>
              <td className="break-words px-2 py-2 font-medium text-gray-900 dark:text-gray-100">
                {a.company_name}
              </td>
              <td className="break-words px-2 py-2 text-gray-700 dark:text-gray-300">{a.job_title}</td>
              <td className="break-words px-2 py-2 text-gray-700 dark:text-gray-300">{a.location ?? 'N/A'}</td>
              <td
                className="overflow-hidden text-ellipsis whitespace-nowrap px-2 py-2 text-gray-700 dark:text-gray-300"
                title={formatSalaryRange(a.salary_min, a.salary_max)}
              >
                {formatSalaryRange(a.salary_min, a.salary_max)}
              </td>
              <td className="break-words px-2 py-2 text-gray-700 dark:text-gray-300">
                {formatDateFull(a.application_date)}
              </td>
              <td className="px-2 py-2">
                <StatusBadge status={a.status} />
              </td>
              <td
                className="break-words px-2 py-2 text-gray-700 dark:text-gray-300"
                title={`${stageDays[a.id] ?? 0} day${(stageDays[a.id] ?? 0) === 1 ? '' : 's'} in this stage`}
              >
                {stageDays[a.id] ?? 0}d
              </td>
              <td className="break-words px-2 py-2 text-gray-700 dark:text-gray-300">
                {!a.dashboard_url ? (
                  'N/A'
                ) : readOnly ? (
                  <span className="text-gray-400 dark:text-gray-500">On file</span>
                ) : (
                  <a
                    href={a.dashboard_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Open
                  </a>
                )}
              </td>
              <td className="px-2 py-2">
                {!readOnly && (
                  <div className="flex flex-col gap-1">
                    <Link
                      href={`/applications/${a.id}/edit`}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Edit
                    </Link>
                    <DeleteButton id={a.id} />
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
