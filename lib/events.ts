import { createClient } from './supabase/server';
import type { ApplicationEvent } from './types';

export async function getAllApplicationEvents(): Promise<ApplicationEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('application_events')
    .select('*')
    .order('changed_at', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ApplicationEvent[];
}
