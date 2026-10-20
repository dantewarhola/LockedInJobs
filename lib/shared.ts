import { createClient } from './supabase/server';
import { DEFAULT_WEEKLY_GOAL, type Application, type ApplicationEvent } from './types';

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SharedDashboardData {
  applications: Application[];
  events: ApplicationEvent[];
  weeklyGoal: number;
}

/** Resolves a share token to its owner's dashboard data, or null if the token is unknown/deleted. */
export async function getSharedDashboardData(token: string): Promise<SharedDashboardData | null> {
  if (!TOKEN_RE.test(token)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_shared_dashboard_data', { p_token: token });
  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    applications: (data.applications ?? []) as Application[],
    events: (data.events ?? []) as ApplicationEvent[],
    weeklyGoal: (data.weeklyGoal as number) ?? DEFAULT_WEEKLY_GOAL,
  };
}

export function filterActive(apps: Application[]): Application[] {
  return [...apps]
    .filter((a) => a.status !== 'Rejected')
    .sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      if (a.application_date !== b.application_date) {
        return a.application_date > b.application_date ? -1 : 1;
      }
      return a.created_at > b.created_at ? -1 : 1;
    });
}

export function filterRejected(apps: Application[]): Application[] {
  return [...apps]
    .filter((a) => a.status === 'Rejected')
    .sort((a, b) => ((a.rejected_at ?? '') > (b.rejected_at ?? '') ? -1 : 1));
}
