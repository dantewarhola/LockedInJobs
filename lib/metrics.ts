import type { Application, ApplicationEvent } from './types';

const DAY_MS = 86_400_000;

/**
 * Whole days the application has been sitting in its current stage.
 *
 * - Status `Applied` (including anything changed back to Applied) is measured
 *   from `application_date`.
 * - Any other status is measured from the most recent event that moved the
 *   application *into* that status. Applications with no such event (older rows
 *   backfilled before the event log existed) fall back to `application_date`.
 */
export function daysInCurrentStage(
  app: Application,
  events: ApplicationEvent[],
  now: Date,
): number {
  let anchorMs = Date.parse(`${app.application_date}T00:00:00`);

  if (app.status !== 'Applied') {
    let latest = Number.NEGATIVE_INFINITY;
    for (const e of events) {
      if (e.application_id !== app.id || e.to_status !== app.status) continue;
      const t = Date.parse(e.changed_at);
      if (t > latest) latest = t;
    }
    if (latest > Number.NEGATIVE_INFINITY) anchorMs = latest;
  }

  return Math.max(0, Math.floor((now.getTime() - anchorMs) / DAY_MS));
}

export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface WeeklyProgress {
  count: number;
  goal: number;
  pct: number;
  weekStart: string;
}

export function weeklyProgress(apps: Application[], now: Date, goal: number): WeeklyProgress {
  const monday = new Date(now);
  const daysSinceMonday = (now.getDay() + 6) % 7;
  monday.setDate(now.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);

  const weekStart = toLocalDateString(monday);
  const today = toLocalDateString(now);
  const count = apps.filter(
    (a) => a.application_date >= weekStart && a.application_date <= today,
  ).length;
  const pct = goal <= 0 ? 0 : Math.min(100, Math.round((count / goal) * 100));

  return { count, goal, pct, weekStart };
}

function addDays(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return toLocalDateString(d);
}

export function streak(apps: Application[], now: Date): { current: number; longest: number } {
  const days = new Set(apps.map((a) => a.application_date));
  if (days.size === 0) return { current: 0, longest: 0 };

  const sorted = [...days].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    run = addDays(sorted[i - 1], 1) === sorted[i] ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  const today = toLocalDateString(now);
  const yesterday = addDays(today, -1);
  let cursor: string | null = days.has(today) ? today : days.has(yesterday) ? yesterday : null;
  let current = 0;
  while (cursor && days.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  return { current, longest };
}
