import { createClient } from './supabase/server';

export const FILES_BUCKET = 'application-files';

export interface StoredFile {
  name: string;
  size: number;
  createdAt: string | null;
}

export async function listFiles(): Promise<StoredFile[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase.storage.from(FILES_BUCKET).list(user.id, {
    limit: 200,
    sortBy: { column: 'created_at', order: 'desc' },
  });
  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((o) => o.id !== null && o.name !== '.emptyFolderPlaceholder')
    .map((o) => ({
      name: o.name,
      size: typeof o.metadata?.size === 'number' ? o.metadata.size : 0,
      createdAt: o.created_at ?? null,
    }));
}
