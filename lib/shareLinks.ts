import { createClient } from './supabase/server';

export interface ShareLink {
  token: string;
  createdAt: string;
}

export async function getMyShareLink(): Promise<ShareLink | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('share_links')
    .select('token, created_at')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { token: data.token, createdAt: data.created_at };
}

export async function createShareLink(): Promise<ShareLink> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const { data, error } = await supabase
    .from('share_links')
    .insert({ user_id: user.id })
    .select('token, created_at')
    .single();
  if (error) throw new Error(error.message);
  return { token: data.token, createdAt: data.created_at };
}

export async function deleteMyShareLink(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const { error } = await supabase.from('share_links').delete().eq('user_id', user.id);
  if (error) throw new Error(error.message);
}
