import {
  RESPONSE_STATUSES,
  TIMED_STAGES,
  type Application,
  type ApplicationEvent,
  type Status,
} from './types';

const DAY_MS = 86_400_000;

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function groupSortedByApp(events: ApplicationEvent[]): ApplicationEvent[][] {
  const map = new Map<string, ApplicationEvent[]>();
  for (const e of events) {
    const list = map.get(e.application_id);
    if (list) list.push(e);
    else map.set(e.application_id, [e]);
  }
  return [...map.values()].map((list) =>
    [...list].sort((a, b) => Date.parse(a.changed_at) - Date.parse(b.changed_at)),
  );
}

export function medianDaysToFirstResponse(events: ApplicationEvent[]): number | null {
  const gaps: number[] = [];
  for (const group of groupSortedByApp(events)) {
    if (group.length === 0) continue;
    const appliedAt = Date.parse(group[0].changed_at);
    const response = group.find((e) => RESPONSE_STATUSES.includes(e.to_status));
    if (!response) continue;
    gaps.push(Math.max(0, (Date.parse(response.changed_at) - appliedAt) / DAY_MS));
  }
  return median(gaps);
}

export interface StageDwell {
  stage: Status;
  medianDays: number;
  count: number;
}

export function medianDaysInStage(events: ApplicationEvent[], now: Date): StageDwell[] {
  const samples = new Map<Status, number[]>();
  const add = (stage: Status, days: number) => {
    const list = samples.get(stage);
    if (list) list.push(days);
    else samples.set(stage, [days]);
  };

  for (const group of groupSortedByApp(events)) {
    for (let i = 0; i < group.length - 1; i += 1) {
      const stage = group[i].to_status;
      if (!TIMED_STAGES.includes(stage)) continue;
      add(stage, (Date.parse(group[i + 1].changed_at) - Date.parse(group[i].changed_at)) / DAY_MS);
    }
    const last = group[group.length - 1];
    if (group.length >= 2 && last && TIMED_STAGES.includes(last.to_status)) {
      add(last.to_status, Math.max(0, (now.getTime() - Date.parse(last.changed_at)) / DAY_MS));
    }
  }

  const out: StageDwell[] = [];
  for (const stage of TIMED_STAGES) {
    const list = samples.get(stage);
    if (list && list.length > 0) {
      out.push({ stage, medianDays: median(list) as number, count: list.length });
    }
  }
  return out;
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
