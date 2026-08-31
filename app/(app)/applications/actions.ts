'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  applicationSchema,
  flattenErrors,
  parseApplicationForm,
  toRow,
} from '@/lib/validation';

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

function revalidateAll() {
  revalidatePath('/');
  revalidatePath('/applications');
  revalidatePath('/rejected');
}

export async function createApplication(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = applicationSchema.safeParse(parseApplicationForm(formData));
  if (!parsed.success) return { fieldErrors: flattenErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from('applications').insert(toRow(parsed.data));
  if (error) return { error: error.message };

  revalidateAll();
  redirect('/applications');
}

export async function updateApplication(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get('id') ?? '');
  if (!id) return { error: 'Missing application id.' };

  const parsed = applicationSchema.safeParse(parseApplicationForm(formData));
  if (!parsed.success) return { fieldErrors: flattenErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from('applications').update(toRow(parsed.data)).eq('id', id);
  if (error) return { error: error.message };

  revalidateAll();
  redirect(parsed.data.status === 'Rejected' ? '/rejected' : '/applications');
}

export async function deleteApplication(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from('applications').delete().eq('id', id);
  if (error) throw new Error(error.message);

  revalidateAll();
}
