'use server';

import { revalidatePath } from 'next/cache';
import { setWeeklyGoal } from '@/lib/settings';
import { weeklyGoalSchema } from '@/lib/validation';

export type GoalFormState = { error?: string; ok?: boolean };

export async function updateWeeklyGoal(
  _prev: GoalFormState,
  formData: FormData,
): Promise<GoalFormState> {
  const parsed = weeklyGoalSchema.safeParse(formData.get('goal'));
  if (!parsed.success) {
    return { error: 'Enter a whole number from 1 to 100.' };
  }

  await setWeeklyGoal(parsed.data);
  revalidatePath('/dashboard');
  return { ok: true };
}
