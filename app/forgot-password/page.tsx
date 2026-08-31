'use client';

import { useActionState } from 'react';
import AuthCard, { authErrorClass, authFieldClass } from '@/components/AuthCard';
import { requestPasswordReset, type AuthState } from '@/app/login/actions';

const initialState: AuthState = {};

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);
  const err = state.fieldErrors ?? {};

  if (state.status === 'sent') {
    return (
      <AuthCard title="Check your email" links={[{ href: '/login', label: 'Back to sign in' }]}>
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          If an account exists for that email, a password reset link is on its way.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset your password" links={[{ href: '/login', label: 'Back to sign in' }]}>
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required className={authFieldClass} />
          {err.email && <p className={authErrorClass}>{err.email}</p>}
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
          {pending ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthCard>
  );
}
