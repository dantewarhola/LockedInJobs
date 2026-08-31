'use client';

import { useActionState } from 'react';
import StatusBadge from './StatusBadge';
import {
  commitImport,
  type CommitState,
} from '@/app/(app)/applications/import/actions';
import { formatSalaryRange } from '@/lib/format';
import type { PreviewRow } from '@/lib/import';

const initial: CommitState = { status: 'idle' };

function cell(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

export default function ImportPreview({
  rows,
  validCount,
}: {
  rows: PreviewRow[];
  validCount: number;
}) {
  const [state, formAction, pending] = useActionState(commitImport, initial);
  const skipped = rows.length - validCount;
  const validValues = rows.filter((r) => r.values).map((r) => r.values!);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          {validCount} row{validCount === 1 ? '' : 's'} ready to import
          {skipped > 0 && `, ${skipped} will be skipped`}.
        </p>
        <form action={formAction}>
          <input type="hidden" name="rows" value={JSON.stringify(validValues)} />
          <button
            type="submit"
            disabled={pending || validCount === 0}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {pending ? 'Importing…' : `Import ${validCount} row${validCount === 1 ? '' : 's'}`}
          </button>
        </form>
      </div>

      {state.status === 'error' && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2">Row</th>
              <th className="px-3 py-2">Business</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Salary</th>
              <th className="px-3 py-2">Applied</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Issues</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => {
              const v = r.values;
              return (
                <tr key={r.index} className={v ? '' : 'bg-red-50'}>
                  <td className="px-3 py-2 text-gray-500">{r.index}</td>
                  <td className="px-3 py-2 text-gray-900">
                    {v ? v.company_name : cell(r.raw.Business)}
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {v ? v.job_title : cell(r.raw['Job Title'])}
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {v ? (v.location ?? 'N/A') : cell(r.raw.Location)}
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {v ? formatSalaryRange(v.salary_min, v.salary_max) : cell(r.raw.Salary)}
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {v ? v.application_date : cell(r.raw['Application Date'])}
                  </td>
                  <td className="px-3 py-2">
                    {v ? <StatusBadge status={v.status} /> : cell(r.raw.Status)}
                  </td>
                  <td className="px-3 py-2 text-red-700">{r.errors.join('; ')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
