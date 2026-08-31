'use client';

import { useActionState } from 'react';
import { updateWeeklyGoal, type GoalFormState } from '@/app/(app)/dashboard/actions';

const initialState: GoalFormState = {};

export default function WeeklyGoalBar({
  count,
  goal,
  pct,
}: {
  count: number;
  goal: number;
  pct: number;
}) {
  const [state, formAction, pending] = useActionState(updateWeeklyGoal, initialState);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">This week</h2>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {count} / {goal} applications
        </span>
      </div>

      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"
        role="progressbar"
        aria-valuenow={count}
        aria-valuemin={0}
        aria-valuemax={goal}
      >
        <div className="h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
      </div>

      <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
        <label htmlFor="weekly-goal" className="text-xs text-gray-500 dark:text-gray-400">
          Weekly goal
        </label>
        <input
          id="weekly-goal"
          name="goal"
          type="number"
          min={1}
          max={100}
          defaultValue={goal}
          className="w-16 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        {state.error && (
          <span role="alert" className="text-xs text-red-600 dark:text-red-400">
            {state.error}
          </span>
        )}
      </form>
    </div>
  );
}
