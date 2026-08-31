'use server';

import { redirect } from 'next/navigation';
import { credentialsSchema, parseNewCredentials } from '@/lib/auth-validation';
import { getSiteUrl } from '@/lib/site-url';
import { createClient } from '@/lib/supabase/server';

export type AuthState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  status?: 'check-email' | 'sent' | 'updated';
};

export async function login(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!email || !password) return { error: 'Email and password are required.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/confirm/i.test(error.message)) {
      return { error: 'Please confirm your email first — check your inbox for the link.' };
    }
    return { error: 'Invalid email or password.' };
  }

  redirect('/');
}

export async function signUp(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = parseNewCredentials(formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${await getSiteUrl()}/auth/confirm?next=/`,
    },
  });
  if (error) return { error: error.message };

  return { status: 'check-email' };
}

export async function requestPasswordReset(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '');
  const parsed = credentialsSchema.pick({ email: true }).safeParse({ email });
  if (!parsed.success) {
    return { fieldErrors: { email: 'Enter a valid email' } };
  }

  const supabase = await createClient();
  // Ignore the result: never reveal whether an account exists.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await getSiteUrl()}/auth/confirm?next=/update-password`,
  });

  return { status: 'sent' };
}

export async function updatePassword(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  const parsed = credentialsSchema.shape.password.safeParse(password);
  if (!parsed.success) {
    return { fieldErrors: { password: parsed.error.issues[0]?.message ?? 'Invalid password' } };
  }
  if (password !== confirm) {
    return { fieldErrors: { confirm: 'Passwords do not match' } };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Your reset link has expired. Request a new one.' };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  redirect('/');
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
