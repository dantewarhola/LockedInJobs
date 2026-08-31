import { createClient } from './supabase/server';
import { DEFAULT_WEEKLY_GOAL } from './types';

export async function getWeeklyGoal(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_settings')
    .select('weekly_goal')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.weekly_goal ?? DEFAULT_WEEKLY_GOAL;
}

export async function setWeeklyGoal(goal: number): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, weekly_goal: goal }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}
