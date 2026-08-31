'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import ImportPreview from '@/components/ImportPreview';
import { parseImport, type ParseState } from './actions';

const initial: ParseState = { status: 'idle' };

export default function ImportPage() {
  const [state, formAction, pending] = useActionState(parseImport, initial);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Import from Excel</h1>
        <Link href="/applications" className="text-sm text-gray-500 hover:text-gray-900">
          Back to applications
        </Link>
      </div>

      <form action={formAction} className="space-y-3">
        <p className="text-sm text-gray-500">
          Upload a <code>.xlsx</code> file with these columns: Business, Job Title, Location,
          Salary, Application Date, Status, Link. Salary may be a range like{' '}
          <code>$80,000 - $120,000</code> or <code>N/A</code>. A blank or <code>N/A</code> status
          is imported as the &quot;N/A&quot; status.
        </p>
        <input
          type="file"
          name="file"
          accept=".xlsx"
          required
          className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          {pending ? 'Reading…' : 'Upload & preview'}
        </button>
      </form>

      {state.status === 'error' && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      {state.status === 'parsed' && (
        <ImportPreview rows={state.rows} validCount={state.validCount} />
      )}
    </section>
  );
}
