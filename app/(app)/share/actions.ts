'use server';

import { revalidatePath } from 'next/cache';
import { createShareLink, deleteMyShareLink } from '@/lib/shareLinks';

export async function generateShareLink(): Promise<void> {
  await createShareLink();
  revalidatePath('/share');
}

export async function deleteShareLink(): Promise<void> {
  await deleteMyShareLink();
  revalidatePath('/share');
}
