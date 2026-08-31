'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { parseWorkbook, type PreviewRow } from '@/lib/import';
import { createClient } from '@/lib/supabase/server';
import { applicationSchema, toRow } from '@/lib/validation';

export type ParseState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'parsed'; rows: PreviewRow[]; validCount: number };

export async function parseImport(_prev: ParseState, formData: FormData): Promise<ParseState> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { status: 'error', message: 'Choose an .xlsx file to upload.' };
  }
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    return { status: 'error', message: 'The file must be a .xlsx spreadsheet.' };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = await parseWorkbook(buffer);
    if (rows.length === 0) {
      return { status: 'error', message: 'No data rows found in the spreadsheet.' };
    }
    const validCount = rows.filter((r) => r.values).length;
    return { status: 'parsed', rows, validCount };
  } catch (e) {
    return {
      status: 'error',
      message: e instanceof Error ? e.message : 'Could not read the spreadsheet.',
    };
  }
}

export type CommitState = { status: 'idle' } | { status: 'error'; message: string };

export async function commitImport(_prev: CommitState, formData: FormData): Promise<CommitState> {
  const payload = formData.get('rows');
  if (typeof payload !== 'string') {
    return { status: 'error', message: 'Nothing to import. Re-upload the file.' };
  }

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(payload);
  } catch {
    return { status: 'error', message: 'Import data was corrupted. Re-upload the file.' };
  }

  if (!Array.isArray(parsedPayload) || parsedPayload.length === 0) {
    return { status: 'error', message: 'No valid rows to import.' };
  }

  const rows: ReturnType<typeof toRow>[] = [];
  for (const candidate of parsedPayload) {
    const parsed = applicationSchema.safeParse(candidate);
    if (!parsed.success) {
      return { status: 'error', message: 'A row failed validation. Re-upload the file.' };
    }
    rows.push(toRow(parsed.data));
  }

  const supabase = await createClient();
  const { error } = await supabase.from('applications').insert(rows);
  if (error) return { status: 'error', message: error.message };

  revalidatePath('/dashboard');
  revalidatePath('/applications');
  revalidatePath('/rejected');
  redirect('/applications');
}
