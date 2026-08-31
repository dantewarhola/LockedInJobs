import { createClient } from './supabase/server';
import type { Application } from './types';

export async function getActiveApplications(): Promise<Application[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .neq('status', 'Rejected')
    .order('application_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Application[];
}

export async function getRejectedApplications(): Promise<Application[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('status', 'Rejected')
    .order('rejected_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Application[];
}

export async function getAllApplications(): Promise<Application[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('applications').select('*');
  if (error) throw new Error(error.message);
  return (data ?? []) as Application[];
}

export async function getApplication(id: string): Promise<Application | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Application | null) ?? null;
}
