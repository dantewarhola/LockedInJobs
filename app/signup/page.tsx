'use client';

import { useActionState } from 'react';
import AuthCard, { authErrorClass, authFieldClass } from '@/components/AuthCard';
import { signUp, type AuthState } from '@/app/login/actions';

const initialState: AuthState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUp, initialState);
  const err = state.fieldErrors ?? {};

  if (state.status === 'check-email') {
    return (
      <AuthCard title="Almost there" links={[{ href: '/login', label: 'Back to sign in' }]}>
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950/50 dark:text-green-300">
          Check your email for a confirmation link. Once confirmed, you can sign in.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Create your account" links={[{ href: '/login', label: 'Back to sign in' }]}>
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required className={authFieldClass} />
          {err.email && <p className={authErrorClass}>{err.email}</p>}
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Password
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
          <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Confirm password
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
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthCard>
  );
}
