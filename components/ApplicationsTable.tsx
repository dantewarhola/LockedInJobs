import Link from 'next/link';
import DeleteButton from './DeleteButton';
import StatusBadge from './StatusBadge';
import { formatDate, formatSalaryRange } from '@/lib/format';
import type { Application } from '@/lib/types';

export default function ApplicationsTable({
  applications,
  emptyMessage,
}: {
  applications: Application[];
  emptyMessage: string;
}) {
  if (applications.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-gray-300 p-6 text-center text-gray-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-2">Business</th>
            <th className="px-4 py-2">Title</th>
            <th className="px-4 py-2">Location</th>
            <th className="px-4 py-2">Salary</th>
            <th className="px-4 py-2">Applied</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Link</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {applications.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-2 font-medium text-gray-900">{a.company_name}</td>
              <td className="px-4 py-2 text-gray-700">{a.job_title}</td>
              <td className="px-4 py-2 text-gray-700">{a.location ?? 'N/A'}</td>
              <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                {formatSalaryRange(a.salary_min, a.salary_max)}
              </td>
              <td className="px-4 py-2 text-gray-700">{formatDate(a.application_date)}</td>
              <td className="px-4 py-2">
                <StatusBadge status={a.status} />
              </td>
              <td className="px-4 py-2">
                {a.dashboard_url ? (
                  <a
                    href={a.dashboard_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Open
                  </a>
                ) : (
                  'N/A'
                )}
              </td>
              <td className="px-4 py-2">
                <div className="flex gap-3">
                  <Link
                    href={`/applications/${a.id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
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
