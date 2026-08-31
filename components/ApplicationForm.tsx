'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import {
  createApplication,
  updateApplication,
  type FormState,
} from '@/app/(app)/applications/actions';
import { STATUS_VALUES, type Application } from '@/lib/types';

const initial: FormState = {};

type Props =
  | { mode: 'create'; application?: undefined }
  | { mode: 'edit'; application: Application };

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const field =
  'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600';
const errText = 'mt-1 text-sm text-red-600';

export default function ApplicationForm(props: Props) {
  const isEdit = props.mode === 'edit';
  const action = isEdit ? updateApplication : createApplication;
  const [state, formAction, pending] = useActionState(action, initial);
  const a = props.application;
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      {isEdit && <input type="hidden" name="id" defaultValue={a!.id} />}

      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
          Business name
        </label>
        <input
          id="company_name"
          name="company_name"
          defaultValue={a?.company_name ?? ''}
          required
          className={field}
        />
        {err.company_name && <p className={errText}>{err.company_name}</p>}
      </div>

      <div>
        <label htmlFor="job_title" className="block text-sm font-medium text-gray-700">
          Job title
        </label>
        <input
          id="job_title"
          name="job_title"
          defaultValue={a?.job_title ?? ''}
          required
          className={field}
        />
        {err.job_title && <p className={errText}>{err.job_title}</p>}
      </div>

      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700">
          Location <span className="text-gray-400">(leave blank for N/A)</span>
        </label>
        <input id="location" name="location" defaultValue={a?.location ?? ''} className={field} />
        {err.location && <p className={errText}>{err.location}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="salary_min" className="block text-sm font-medium text-gray-700">
            Salary min (USD)
          </label>
          <input
            id="salary_min"
            name="salary_min"
            type="number"
            min="0"
            step="1"
            defaultValue={a?.salary_min ?? ''}
            className={field}
          />
          {err.salary_min && <p className={errText}>{err.salary_min}</p>}
        </div>
        <div>
          <label htmlFor="salary_max" className="block text-sm font-medium text-gray-700">
            Salary max (USD)
          </label>
          <input
            id="salary_max"
            name="salary_max"
            type="number"
            min="0"
            step="1"
            defaultValue={a?.salary_max ?? ''}
            className={field}
          />
          {err.salary_max && <p className={errText}>{err.salary_max}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="application_date" className="block text-sm font-medium text-gray-700">
          Application date
        </label>
        <input
          id="application_date"
          name="application_date"
          type="date"
          defaultValue={a?.application_date ?? todayISO()}
          required
          className={field}
        />
        {err.application_date && <p className={errText}>{err.application_date}</p>}
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={a?.status ?? 'Applied'}
          className={field}
        >
          {STATUS_VALUES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {err.status && <p className={errText}>{err.status}</p>}
      </div>

      <div>
        <label htmlFor="dashboard_url" className="block text-sm font-medium text-gray-700">
          Application dashboard link <span className="text-gray-400">(leave blank for N/A)</span>
        </label>
        <input
          id="dashboard_url"
          name="dashboard_url"
          type="url"
          defaultValue={a?.dashboard_url ?? ''}
          className={field}
        />
        {err.dashboard_url && <p className={errText}>{err.dashboard_url}</p>}
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea id="notes" name="notes" rows={3} defaultValue={a?.notes ?? ''} className={field} />
        {err.notes && <p className={errText}>{err.notes}</p>}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Add application'}
        </button>
        <Link href="/applications" className="text-sm text-gray-500 hover:text-gray-900">
          Cancel
        </Link>
      </div>
    </form>
  );
}
