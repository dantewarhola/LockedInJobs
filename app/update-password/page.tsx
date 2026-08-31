'use client';

import { useActionState } from 'react';
import AuthCard, { authErrorClass, authFieldClass } from '@/components/AuthCard';
import { updatePassword, type AuthState } from '@/app/login/actions';

const initialState: AuthState = {};

export default function UpdatePasswordPage() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);
  const err = state.fieldErrors ?? {};

  return (
    <AuthCard title="Choose a new password">
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className={authFieldClass}
          />
          {err.password && <p className={authErrorClass}>{err.password}</p>}
        </div>
        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">
            Confirm new password
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            className={authFieldClass}
          />
          {err.confirm && <p className={authErrorClass}>{err.confirm}</p>}
        </div>
        {state.error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </AuthCard>
  );
}
