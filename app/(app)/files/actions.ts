'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { FILES_BUCKET } from '@/lib/files';
import { sanitizeFileName, validatePdf } from '@/lib/pdf';
import { createClient } from '@/lib/supabase/server';

export type UploadState = { error?: string; ok?: boolean };

export async function uploadFile(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose a PDF file to upload.' };
  }

  const head = await file.slice(0, 5).text();
  const problem = validatePdf({ name: file.name, type: file.type, size: file.size, head });
  if (problem) return { error: problem };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You are not signed in.' };

  const name = sanitizeFileName(file.name);
  const { error } = await supabase.storage
    .from(FILES_BUCKET)
    .upload(`${user.id}/${name}`, file, { contentType: 'application/pdf', upsert: false });

  if (error) {
    if (/exist/i.test(error.message)) {
      return {
        error: `A file named "${name}" already exists. Delete it first, or rename your file.`,
      };
    }
    return { error: error.message };
  }

  revalidatePath('/files');
  return { ok: true };
}

export async function downloadFile(formData: FormData): Promise<void> {
  const name = String(formData.get('name') ?? '');
  if (!name) redirect('/files');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data, error } = await supabase.storage
    .from(FILES_BUCKET)
    .createSignedUrl(`${user.id}/${name}`, 60, { download: name });

  if (error || !data) redirect('/files?error=download');
  redirect(data.signedUrl);
}

export async function deleteFile(formData: FormData): Promise<void> {
  const name = String(formData.get('name') ?? '');
  if (!name) redirect('/files');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase.storage
    .from(FILES_BUCKET)
    .remove([`${user.id}/${name}`]);
  if (error) throw new Error(error.message);

  revalidatePath('/files');
}
