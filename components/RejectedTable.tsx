import Link from 'next/link';
import DeleteButton from './DeleteButton';
import { formatDate, formatDateFull, formatSalaryRange } from '@/lib/format';
import type { Application } from '@/lib/types';

export default function RejectedTable({
  applications,
  emptyMessage = 'No rejected applications. Keep going.',
}: {
  applications: Application[];
  emptyMessage?: string;
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
      <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          <tr>
            <th className="px-4 py-2">Business</th>
            <th className="px-4 py-2">Title</th>
            <th className="px-4 py-2">Location</th>
            <th className="px-4 py-2">Salary</th>
            <th className="px-4 py-2">Applied</th>
            <th className="px-4 py-2">Rejected</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {applications.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                {a.company_name}
              </td>
              <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{a.job_title}</td>
              <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{a.location ?? 'N/A'}</td>
              <td className="whitespace-nowrap px-4 py-2 text-gray-700 dark:text-gray-300">
                {formatSalaryRange(a.salary_min, a.salary_max)}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-gray-700 dark:text-gray-300">
                {formatDateFull(a.application_date)}
              </td>
              <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                {a.rejected_at ? formatDate(a.rejected_at.slice(0, 10)) : '—'}
              </td>
              <td className="px-4 py-2">
                <div className="flex gap-3">
                  <Link
                    href={`/applications/${a.id}/edit`}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Edit / un-reject
                  </Link>
                  <DeleteButton id={a.id} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
