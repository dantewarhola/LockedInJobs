# Dashboard Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add median time-to-first-response, median time-in-stage, a weekly applications goal bar, and a daily streak widget to the dashboard, backed by a new append-only application-status event log.

**Architecture:** A Postgres trigger writes one `application_events` row on every `applications` insert and every status change. Pure functions in `lib/metrics.ts` derive all four metrics from the already-fetched applications + events + the user's weekly goal. The dashboard server component fetches the extra data in one `Promise.all` and renders four new UI pieces. The weekly goal lives in a new `user_settings` table and is edited inline via a server action.

**Tech Stack:** Next.js App Router (v16, `next dev` regenerates route types), TypeScript, Supabase Postgres + `@supabase/ssr`, Tailwind, Recharts, Vitest, zod.

**Spec:** `docs/superpowers/specs/2026-08-31-dashboard-metrics-design.md`

## Global Constraints

- Status values are exactly: `Applied`, `Online Assessment`, `Interview`, `Offer`, `Rejected`, `Withdrawn`, `Ghosted`, `N/A` (from `lib/types.ts` `STATUS_VALUES`).
- `RESPONSE_STATUSES` = `['Online Assessment', 'Interview', 'Offer', 'Rejected']` — a rejection counts as a response; Ghosted / Withdrawn do not.
- `TIMED_STAGES` = `['Applied', 'Online Assessment', 'Interview', 'Offer']` — terminal states are never measured for dwell time.
- Default weekly goal = `5`; allowed range `1..100` inclusive.
- Week starts Monday, local server time. "Today" / "this week" use server local time (documented limitation).
- Metric functions are pure, take an explicit `now: Date` where time matters, and never throw — sparse data yields `null` or `[]`.
- Match existing card styling: `rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900`. Chart bar/line colour is `#2563eb`.
- Test files live in `tests/**/*.test.ts`, `environment: node`. Follow the existing `let seq = 0; function app(partial) {...}` factory style (see `tests/stats.test.ts`).
- Data-access modules (`lib/applications.ts` pattern) have no unit tests in this repo; new data-access modules follow suit and are verified by typecheck + build.
- Commit after every task. Conventional-commit prefixes (`feat:`, `test:`, `chore:`).

---

## File Structure

New:

| File | Responsibility |
|---|---|
| `supabase/migrations/0004_application_events.sql` | `application_events` table, logging trigger, backfill, RLS |
| `supabase/migrations/0005_user_settings.sql` | `user_settings` table, `updated_at` trigger, RLS |
| `lib/metrics.ts` | Pure metric functions: `median`, `medianDaysToFirstResponse`, `medianDaysInStage`, `toLocalDateString`, `weeklyProgress`, `streak` |
| `lib/events.ts` | `getAllApplicationEvents()` data access |
| `lib/settings.ts` | `getWeeklyGoal()` / `setWeeklyGoal()` data access |
| `app/(app)/dashboard/actions.ts` | `updateWeeklyGoal` server action |
| `components/StreakCard.tsx` | Streak card (server component) |
| `components/WeeklyGoalBar.tsx` | Weekly progress bar + inline goal editor (client) |
| `components/StageDwellChart.tsx` | Horizontal bar chart of median days per stage (client) |
| `tests/types.test.ts` | Asserts the new status constants |
| `tests/metrics.test.ts` | Unit tests for `lib/metrics.ts` |

Modified:

| File | Change |
|---|---|
| `lib/types.ts` | `ApplicationEvent`, `UserSettings` interfaces; `RESPONSE_STATUSES`, `TIMED_STAGES`, `DEFAULT_WEEKLY_GOAL` constants |
| `lib/format.ts` | `formatDays(n)` |
| `lib/validation.ts` | `weeklyGoalSchema` |
| `tests/format.test.ts` | `formatDays` cases |
| `tests/validation.test.ts` | `weeklyGoalSchema` cases |
| `app/(app)/dashboard/page.tsx` | Fetch events + goal, compute metrics, render the four new pieces |

No `README.md` change — its setup section does not enumerate migrations individually.

---

## Task 1: Types and metric constants

**Files:**
- Modify: `lib/types.ts`
- Test: `tests/types.test.ts` (create)

**Interfaces:**
- Consumes: existing `Status`, `STATUS_VALUES` from `lib/types.ts`.
- Produces:
  - `interface ApplicationEvent { id: string; application_id: string; user_id: string; from_status: Status | null; to_status: Status; changed_at: string }`
  - `interface UserSettings { user_id: string; weekly_goal: number }`
  - `const RESPONSE_STATUSES: readonly Status[]`
  - `const TIMED_STAGES: readonly Status[]`
  - `const DEFAULT_WEEKLY_GOAL = 5`

- [ ] **Step 1: Write the failing test**

Create `tests/types.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_WEEKLY_GOAL, RESPONSE_STATUSES, TIMED_STAGES } from '../lib/types';

describe('metric status constants', () => {
  it('RESPONSE_STATUSES is the employer-response set', () => {
    expect([...RESPONSE_STATUSES]).toEqual([
      'Online Assessment',
      'Interview',
      'Offer',
      'Rejected',
    ]);
  });

  it('TIMED_STAGES excludes terminal states', () => {
    expect([...TIMED_STAGES]).toEqual(['Applied', 'Online Assessment', 'Interview', 'Offer']);
    for (const terminal of ['Rejected', 'Ghosted', 'Withdrawn', 'N/A']) {
      expect(TIMED_STAGES).not.toContain(terminal);
    }
  });

  it('DEFAULT_WEEKLY_GOAL is 5', () => {
    expect(DEFAULT_WEEKLY_GOAL).toBe(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/types.test.ts`
Expected: FAIL — `RESPONSE_STATUSES`/`TIMED_STAGES`/`DEFAULT_WEEKLY_GOAL` are not exported.

- [ ] **Step 3: Add the types and constants**

Append to `lib/types.ts` (after the existing `Application` interface):

```ts
export interface ApplicationEvent {
  id: string;
  application_id: string;
  user_id: string;
  from_status: Status | null;
  to_status: Status;
  changed_at: string; // ISO timestamp
}

export interface UserSettings {
  user_id: string;
  weekly_goal: number;
}

/** A status that represents an employer response to an application. */
export const RESPONSE_STATUSES: readonly Status[] = [
  'Online Assessment',
  'Interview',
  'Offer',
  'Rejected',
];

/** Stages whose dwell time we measure. Excludes terminal / non-progress states. */
export const TIMED_STAGES: readonly Status[] = [
  'Applied',
  'Online Assessment',
  'Interview',
  'Offer',
];

export const DEFAULT_WEEKLY_GOAL = 5;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/types.test.ts`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts tests/types.test.ts
git commit -m "feat: add ApplicationEvent/UserSettings types and metric status constants"
```

---

## Task 2: `median` and `medianDaysToFirstResponse`

**Files:**
- Create: `lib/metrics.ts`
- Test: `tests/metrics.test.ts` (create)

**Interfaces:**
- Consumes: `ApplicationEvent`, `Status`, `RESPONSE_STATUSES` from `lib/types.ts`.
- Produces:
  - `export function median(values: number[]): number | null`
  - `export function medianDaysToFirstResponse(events: ApplicationEvent[]): number | null`
  - (module-private) `groupSortedByApp(events: ApplicationEvent[]): ApplicationEvent[][]`
  - (module-private) `const DAY_MS = 86_400_000`

- [ ] **Step 1: Write the failing test**

Create `tests/metrics.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { median, medianDaysToFirstResponse } from '../lib/metrics';
import type { ApplicationEvent, Status } from '../lib/types';

let seq = 0;
function ev(
  application_id: string,
  to_status: Status,
  changed_at: string,
  from_status: Status | null = null,
): ApplicationEvent {
  seq += 1;
  return { id: `e-${seq}`, application_id, user_id: 'u1', from_status, to_status, changed_at };
}
const D = 'T00:00:00Z';

describe('median', () => {
  it('null for empty', () => expect(median([])).toBeNull());
  it('single value', () => expect(median([4])).toBe(4));
  it('odd count returns the middle', () => expect(median([5, 1, 3])).toBe(3));
  it('even count returns the mean of the two middles', () => expect(median([1, 2, 3, 4])).toBe(2.5));
});

describe('medianDaysToFirstResponse', () => {
  it('null when nobody responded', () => {
    expect(medianDaysToFirstResponse([ev('a1', 'Applied', `2026-01-01${D}`)])).toBeNull();
  });

  it('measures applied -> first response in days', () => {
    const events = [
      ev('a1', 'Applied', `2026-01-01${D}`),
      ev('a1', 'Interview', `2026-01-04${D}`, 'Applied'),
    ];
    expect(medianDaysToFirstResponse(events)).toBe(3);
  });

  it('does not treat Ghosted or Withdrawn as a response', () => {
    const events = [
      ev('a1', 'Applied', `2026-01-01${D}`),
      ev('a1', 'Ghosted', `2026-01-10${D}`, 'Applied'),
      ev('a2', 'Applied', `2026-01-01${D}`),
      ev('a2', 'Withdrawn', `2026-01-05${D}`, 'Applied'),
    ];
    expect(medianDaysToFirstResponse(events)).toBeNull();
  });

  it('uses the earliest response event', () => {
    const events = [
      ev('a1', 'Applied', `2026-01-01${D}`),
      ev('a1', 'Online Assessment', `2026-01-03${D}`, 'Applied'),
      ev('a1', 'Interview', `2026-01-09${D}`, 'Online Assessment'),
    ];
    expect(medianDaysToFirstResponse(events)).toBe(2);
  });

  it('takes the median across applications', () => {
    const events = [
      ev('a1', 'Applied', `2026-01-01${D}`),
      ev('a1', 'Interview', `2026-01-03${D}`, 'Applied'), // 2
      ev('a2', 'Applied', `2026-01-01${D}`),
      ev('a2', 'Interview', `2026-01-05${D}`, 'Applied'), // 4
      ev('a3', 'Applied', `2026-01-01${D}`),
      ev('a3', 'Rejected', `2026-01-13${D}`, 'Applied'), // 12
    ];
    expect(medianDaysToFirstResponse(events)).toBe(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/metrics.test.ts`
Expected: FAIL — `lib/metrics.ts` does not exist.

- [ ] **Step 3: Write the implementation**

Create `lib/metrics.ts`:

```ts
import { RESPONSE_STATUSES, type ApplicationEvent } from './types';

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/metrics.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/metrics.ts tests/metrics.test.ts
git commit -m "feat: add median and medianDaysToFirstResponse metrics"
```

---

## Task 3: `medianDaysInStage`

**Files:**
- Modify: `lib/metrics.ts`
- Test: `tests/metrics.test.ts`

**Interfaces:**
- Consumes: `groupSortedByApp`, `median`, `DAY_MS` (already in `lib/metrics.ts`); `TIMED_STAGES`, `Status` from `lib/types.ts`.
- Produces:
  - `export interface StageDwell { stage: Status; medianDays: number; count: number }`
  - `export function medianDaysInStage(events: ApplicationEvent[], now: Date): StageDwell[]`

- [ ] **Step 1: Write the failing test**

Append to `tests/metrics.test.ts` (add `medianDaysInStage` to the import from `../lib/metrics`):

```ts
import { median, medianDaysInStage, medianDaysToFirstResponse } from '../lib/metrics';

describe('medianDaysInStage', () => {
  it('measures each closed stage and the open current stage', () => {
    const events = [
      ev('a1', 'Applied', `2026-01-01${D}`),
      ev('a1', 'Online Assessment', `2026-01-03${D}`, 'Applied'), // Applied: 2
      ev('a1', 'Interview', `2026-01-06${D}`, 'Online Assessment'), // OA: 3
      ev('a1', 'Offer', `2026-01-11${D}`, 'Interview'), // Interview: 5
    ];
    const now = new Date(`2026-01-13${D}`); // Offer open: 2
    expect(medianDaysInStage(events, now)).toEqual([
      { stage: 'Applied', medianDays: 2, count: 1 },
      { stage: 'Online Assessment', medianDays: 3, count: 1 },
      { stage: 'Interview', medianDays: 5, count: 1 },
      { stage: 'Offer', medianDays: 2, count: 1 },
    ]);
  });

  it('does not count terminal stages', () => {
    const events = [
      ev('a1', 'Applied', `2026-01-01${D}`),
      ev('a1', 'Rejected', `2026-01-05${D}`, 'Applied'), // Applied: 4
    ];
    expect(medianDaysInStage(events, new Date(`2026-01-20${D}`))).toEqual([
      { stage: 'Applied', medianDays: 4, count: 1 },
    ]);
  });

  it('ignores an application that only has a seed event', () => {
    const events = [ev('a1', 'Applied', `2026-01-01${D}`)];
    expect(medianDaysInStage(events, new Date(`2026-02-01${D}`))).toEqual([]);
  });

  it('returns stages in canonical order with medians across applications', () => {
    const events = [
      ev('a1', 'Applied', `2026-01-01${D}`),
      ev('a1', 'Interview', `2026-01-03${D}`, 'Applied'), // Applied 2, Interview open
      ev('a2', 'Applied', `2026-01-01${D}`),
      ev('a2', 'Interview', `2026-01-07${D}`, 'Applied'), // Applied 6, Interview open
    ];
    const now = new Date(`2026-01-08${D}`); // a1 Interview 5, a2 Interview 1
    const out = medianDaysInStage(events, now);
    expect(out[0]).toEqual({ stage: 'Applied', medianDays: 4, count: 2 });
    expect(out[1]).toEqual({ stage: 'Interview', medianDays: 3, count: 2 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/metrics.test.ts`
Expected: FAIL — `medianDaysInStage` not exported.

- [ ] **Step 3: Write the implementation**

Append to `lib/metrics.ts` (and add `TIMED_STAGES`, `type Status` to the `./types` import):

```ts
import { RESPONSE_STATUSES, TIMED_STAGES, type ApplicationEvent, type Status } from './types';

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/metrics.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/metrics.ts tests/metrics.test.ts
git commit -m "feat: add medianDaysInStage metric"
```

---

## Task 4: `toLocalDateString` and `weeklyProgress`

**Files:**
- Modify: `lib/metrics.ts`
- Test: `tests/metrics.test.ts`

**Interfaces:**
- Consumes: `Application` from `lib/types.ts`.
- Produces:
  - `export function toLocalDateString(d: Date): string` — local `YYYY-MM-DD`
  - `export interface WeeklyProgress { count: number; goal: number; pct: number; weekStart: string }`
  - `export function weeklyProgress(apps: Application[], now: Date, goal: number): WeeklyProgress`

- [ ] **Step 1: Write the failing test**

Append to `tests/metrics.test.ts`. Add `toLocalDateString, weeklyProgress` to the metrics import and add an `app` factory + `Application` type import:

```ts
import type { Application, ApplicationEvent, Status } from '../lib/types';

function app(application_date: string, status: Status = 'Applied'): Application {
  seq += 1;
  return {
    id: `a-${seq}`,
    user_id: 'u1',
    company_name: 'Acme',
    job_title: 'Eng',
    location: null,
    salary_min: null,
    salary_max: null,
    application_date,
    status,
    dashboard_url: null,
    notes: null,
    rejected_at: null,
    created_at: `${application_date}T00:00:00Z`,
    updated_at: `${application_date}T00:00:00Z`,
  };
}

describe('toLocalDateString', () => {
  it('formats local Y-M-D zero padded', () => {
    expect(toLocalDateString(new Date(2026, 0, 5, 23, 0, 0))).toBe('2026-01-05');
  });
});

describe('weeklyProgress', () => {
  it('counts applications from Monday of the current week through today', () => {
    const now = new Date(2026, 0, 7, 12, 0, 0); // Wed 2026-01-07 local
    const apps = [
      app('2026-01-05'), // Mon — in
      app('2026-01-06'), // Tue — in
      app('2026-01-07'), // Wed — in
      app('2026-01-04'), // prev Sun — out
    ];
    const r = weeklyProgress(apps, now, 5);
    expect(r.weekStart).toBe('2026-01-05');
    expect(r.count).toBe(3);
    expect(r.goal).toBe(5);
    expect(r.pct).toBe(60);
  });

  it('caps pct at 100 when the goal is exceeded', () => {
    const now = new Date(2026, 0, 7, 12, 0, 0);
    const apps = [app('2026-01-05'), app('2026-01-05'), app('2026-01-06')];
    expect(weeklyProgress(apps, now, 2).pct).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/metrics.test.ts`
Expected: FAIL — `toLocalDateString` / `weeklyProgress` not exported.

- [ ] **Step 3: Write the implementation**

Append to `lib/metrics.ts` (add `type Application` to the `./types` import):

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/metrics.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/metrics.ts tests/metrics.test.ts
git commit -m "feat: add weeklyProgress metric"
```

---

## Task 5: `streak`

**Files:**
- Modify: `lib/metrics.ts`
- Test: `tests/metrics.test.ts`

**Interfaces:**
- Consumes: `toLocalDateString` (already in `lib/metrics.ts`); `Application` from `lib/types.ts`.
- Produces:
  - `export function streak(apps: Application[], now: Date): { current: number; longest: number }`
  - (module-private) `addDays(dateStr: string, delta: number): string`

- [ ] **Step 1: Write the failing test**

Append to `tests/metrics.test.ts` (add `streak` to the metrics import):

```ts
describe('streak', () => {
  it('counts consecutive days ending today', () => {
    const now = new Date(2026, 2, 10, 9, 0, 0); // 2026-03-10
    const apps = [
      app('2026-03-10'),
      app('2026-03-09'),
      app('2026-03-08'),
      app('2026-03-06'),
    ];
    expect(streak(apps, now)).toEqual({ current: 3, longest: 3 });
  });

  it('keeps the streak alive when today is empty but yesterday is not', () => {
    const now = new Date(2026, 2, 10, 9, 0, 0);
    const apps = [app('2026-03-09'), app('2026-03-08')];
    expect(streak(apps, now).current).toBe(2);
  });

  it('is zero when neither today nor yesterday has an application', () => {
    const now = new Date(2026, 2, 10, 9, 0, 0);
    const apps = [app('2026-03-01'), app('2026-03-02'), app('2026-03-03')];
    const r = streak(apps, now);
    expect(r.current).toBe(0);
    expect(r.longest).toBe(3);
  });

  it('returns zeros for no applications', () => {
    expect(streak([], new Date())).toEqual({ current: 0, longest: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/metrics.test.ts`
Expected: FAIL — `streak` not exported.

- [ ] **Step 3: Write the implementation**

Append to `lib/metrics.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/metrics.test.ts`
Expected: PASS

- [ ] **Step 5: Full test + typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add lib/metrics.ts tests/metrics.test.ts
git commit -m "feat: add streak metric"
```

---

## Task 6: `formatDays`

**Files:**
- Modify: `lib/format.ts`
- Test: `tests/format.test.ts`

**Interfaces:**
- Produces: `export function formatDays(n: number | null): string`

- [ ] **Step 1: Write the failing test**

Append to `tests/format.test.ts` (add `formatDays` to the import from `../lib/format`):

```ts
describe('formatDays', () => {
  it('renders an em dash for null', () => expect(formatDays(null)).toBe('—'));
  it('renders sub-day gaps as "<1 day"', () => expect(formatDays(0.4)).toBe('<1 day'));
  it('renders a rounded singular day', () => expect(formatDays(1.2)).toBe('1 day'));
  it('renders rounded plural days', () => {
    expect(formatDays(2.6)).toBe('3 days');
    expect(formatDays(12)).toBe('12 days');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/format.test.ts`
Expected: FAIL — `formatDays` not exported.

- [ ] **Step 3: Write the implementation**

Append to `lib/format.ts`:

```ts
export function formatDays(n: number | null): string {
  if (n === null) return '—';
  if (n < 1) return '<1 day';
  const rounded = Math.round(n);
  return `${rounded} ${rounded === 1 ? 'day' : 'days'}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/format.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/format.ts tests/format.test.ts
git commit -m "feat: add formatDays formatter"
```

---

## Task 7: Migration — `application_events` table, trigger, backfill

**Files:**
- Create: `supabase/migrations/0004_application_events.sql`

**Interfaces:**
- Produces: table `public.application_events` readable by `getAllApplicationEvents()` (Task 9). Columns: `id uuid`, `application_id uuid`, `user_id uuid`, `from_status text null`, `to_status text`, `changed_at timestamptz`, `created_at timestamptz`.

This task has no unit test (it is SQL DDL). Verification is SQL review plus, if a Supabase instance is available, applying it and running the check query.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0004_application_events.sql`:

```sql
-- Append-only log of every application status change. Powers the
-- time-to-first-response and time-in-stage dashboard metrics. Rows are written
-- ONLY by the trigger below; users can read their own rows and nothing else.

create table public.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index application_events_user_app_idx
  on public.application_events (user_id, application_id, changed_at);

create or replace function public.tg_applications_log_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.application_events
      (application_id, user_id, from_status, to_status, changed_at)
    values
      (new.id, new.user_id, null, new.status, new.application_date::timestamptz);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.application_events
      (application_id, user_id, from_status, to_status, changed_at)
    values
      (new.id, new.user_id, old.status, new.status, now());
  end if;
  return new;
end;
$$;

create trigger applications_log_event
after insert or update on public.applications
for each row execute function public.tg_applications_log_event();

-- Backfill: one seed event per existing application, at its application_date.
-- Historical transition dates are unknown, so existing applications only start
-- contributing to time-based metrics once they change status again.
insert into public.application_events
  (application_id, user_id, from_status, to_status, changed_at)
select id, user_id, null, 'Applied', application_date::timestamptz
from public.applications;

alter table public.application_events enable row level security;

create policy "application_events_select_own"
  on public.application_events for select
  using (auth.uid() = user_id);
```

- [ ] **Step 2: Review the SQL**

Confirm: trigger is `after insert or update`, `security definer`, `set search_path = public`; backfill runs after the trigger is created; RLS has a select policy only (no insert/update/delete — the definer trigger is the sole writer).

- [ ] **Step 3: Apply if a Supabase instance is available**

Run (only if you have a linked project or local stack): `npx supabase db push`
Then in the SQL editor / `psql`:

```sql
select
  (select count(*) from public.applications) as apps,
  (select count(*) from public.application_events) as events;
```

Expected: `events >= apps` (equal immediately after migration).
If no instance is available, skip — the migration runs at deploy.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0004_application_events.sql
git commit -m "feat: application_events log with status-change trigger and backfill"
```

---

## Task 8: Migration — `user_settings` table

**Files:**
- Create: `supabase/migrations/0005_user_settings.sql`

**Interfaces:**
- Produces: table `public.user_settings` with `user_id uuid pk`, `weekly_goal integer` (default 5, check 1..100), timestamps. Read/written by `lib/settings.ts` (Task 10).

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0005_user_settings.sql`:

```sql
-- Per-user preferences. Currently just the weekly application goal.

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  weekly_goal integer not null default 5 check (weekly_goal between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.tg_user_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger user_settings_updated_at
before update on public.user_settings
for each row execute function public.tg_user_settings_updated_at();

alter table public.user_settings enable row level security;

create policy "user_settings_select_own"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "user_settings_insert_own"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "user_settings_update_own"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

- [ ] **Step 2: Review the SQL**

Confirm: PK is `user_id`; `weekly_goal` check is `between 1 and 100`; RLS policies for select/insert/update all key on `auth.uid() = user_id`; no delete policy.

- [ ] **Step 3: Apply if a Supabase instance is available**

Run (only if available): `npx supabase db push`
Otherwise skip.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0005_user_settings.sql
git commit -m "feat: user_settings table for the weekly application goal"
```

---

## Task 9: `lib/events.ts` data access

**Files:**
- Create: `lib/events.ts`

**Interfaces:**
- Consumes: `createClient` from `lib/supabase/server.ts`; `ApplicationEvent` from `lib/types.ts`.
- Produces: `export async function getAllApplicationEvents(): Promise<ApplicationEvent[]>` — all of the current user's events (RLS-scoped), ordered by `changed_at` then `created_at` ascending.

No unit test (Supabase-backed, matches `lib/applications.ts`). Verified by typecheck.

- [ ] **Step 1: Write the module**

Create `lib/events.ts`:

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/events.ts
git commit -m "feat: getAllApplicationEvents data access"
```

---

## Task 10: `lib/settings.ts` data access

**Files:**
- Create: `lib/settings.ts`

**Interfaces:**
- Consumes: `createClient` from `lib/supabase/server.ts`; `DEFAULT_WEEKLY_GOAL` from `lib/types.ts`.
- Produces:
  - `export async function getWeeklyGoal(): Promise<number>` — the user's goal, or `DEFAULT_WEEKLY_GOAL` when no row exists.
  - `export async function setWeeklyGoal(goal: number): Promise<void>` — upsert on `user_id`. Assumes `goal` is already validated.

No unit test (Supabase-backed). Verified by typecheck.

- [ ] **Step 1: Write the module**

Create `lib/settings.ts`:

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/settings.ts
git commit -m "feat: getWeeklyGoal / setWeeklyGoal data access"
```

---

## Task 11: `weeklyGoalSchema` + `updateWeeklyGoal` server action

**Files:**
- Modify: `lib/validation.ts`
- Create: `app/(app)/dashboard/actions.ts`
- Test: `tests/validation.test.ts`

**Interfaces:**
- Consumes: `zod` (already a dependency); `setWeeklyGoal` from `lib/settings.ts`; `revalidatePath` from `next/cache`.
- Produces:
  - `export const weeklyGoalSchema` in `lib/validation.ts` — `z.coerce.number().int().min(1).max(100)`.
  - `export type GoalFormState = { error?: string; ok?: boolean }` in `app/(app)/dashboard/actions.ts`.
  - `export async function updateWeeklyGoal(_prev: GoalFormState, formData: FormData): Promise<GoalFormState>`.

- [ ] **Step 1: Write the failing test**

Append to `tests/validation.test.ts`:

```ts
import { weeklyGoalSchema } from '../lib/validation';

describe('weeklyGoalSchema', () => {
  it('accepts whole numbers 1 through 100', () => {
    expect(weeklyGoalSchema.parse('5')).toBe(5);
    expect(weeklyGoalSchema.parse('1')).toBe(1);
    expect(weeklyGoalSchema.parse('100')).toBe(100);
  });

  it('rejects zero, negatives, over 100, and non-integers', () => {
    expect(weeklyGoalSchema.safeParse('0').success).toBe(false);
    expect(weeklyGoalSchema.safeParse('-3').success).toBe(false);
    expect(weeklyGoalSchema.safeParse('101').success).toBe(false);
    expect(weeklyGoalSchema.safeParse('2.5').success).toBe(false);
    expect(weeklyGoalSchema.safeParse('abc').success).toBe(false);
  });
});
```

(If `tests/validation.test.ts` does not already `import { describe, expect, it } from 'vitest'`, it does — keep the existing import line.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/validation.test.ts`
Expected: FAIL — `weeklyGoalSchema` not exported.

- [ ] **Step 3: Add the schema**

Append to `lib/validation.ts`:

```ts
export const weeklyGoalSchema = z.coerce.number().int().min(1).max(100);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/validation.test.ts`
Expected: PASS

- [ ] **Step 5: Write the server action**

Create `app/(app)/dashboard/actions.ts`:

```ts
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
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/validation.ts tests/validation.test.ts "app/(app)/dashboard/actions.ts"
git commit -m "feat: weekly goal schema and updateWeeklyGoal server action"
```

---

## Task 12: `StreakCard` component

**Files:**
- Create: `components/StreakCard.tsx`
- Test: `tests/streak-card.test.tsx` (create)

**Interfaces:**
- Consumes: nothing from other tasks (plain props).
- Produces: `export default function StreakCard({ current, longest }: { current: number; longest: number })`.

Note: the test file is `.tsx`. `tests/sankey-render.test.ts` renders a component from a `.ts` file using `createElement`; here we use JSX so the extension is `.tsx`. Vitest's `include` is `tests/**/*.test.ts` — **widen it** to also match `.test.tsx`.

- [ ] **Step 1: Widen the vitest include glob**

In `vitest.config.mts` change:

```ts
    include: ['tests/**/*.test.ts'],
```

to:

```ts
    include: ['tests/**/*.test.{ts,tsx}'],
```

- [ ] **Step 2: Write the failing test**

Create `tests/streak-card.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import StreakCard from '../components/StreakCard';

describe('StreakCard', () => {
  it('shows the current streak and best streak', () => {
    const html = renderToStaticMarkup(<StreakCard current={3} longest={5} />);
    expect(html).toContain('3 days');
    expect(html).toContain('Best: 5 days');
  });

  it('uses the singular "day" for a streak of one', () => {
    const html = renderToStaticMarkup(<StreakCard current={1} longest={1} />);
    expect(html).toContain('1 day');
    expect(html).toContain('Best: 1 day');
  });

  it('prompts to start when the streak is zero', () => {
    const html = renderToStaticMarkup(<StreakCard current={0} longest={4} />);
    expect(html).toContain('Add an application to start a streak');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/streak-card.test.tsx`
Expected: FAIL — `components/StreakCard` does not exist.

- [ ] **Step 4: Write the component**

Create `components/StreakCard.tsx`:

```tsx
function dayWord(n: number): string {
  return n === 1 ? 'day' : 'days';
}

export default function StreakCard({ current, longest }: { current: number; longest: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Streak</h2>
      <p className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
        {current} {dayWord(current)}
      </p>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
        {current === 0
          ? 'Add an application to start a streak'
          : `Best: ${longest} ${dayWord(longest)}`}
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/streak-card.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add vitest.config.mts components/StreakCard.tsx tests/streak-card.test.tsx
git commit -m "feat: StreakCard component"
```

---

## Task 13: `WeeklyGoalBar` component

**Files:**
- Create: `components/WeeklyGoalBar.tsx`

**Interfaces:**
- Consumes: `updateWeeklyGoal`, `GoalFormState` from `app/(app)/dashboard/actions.ts`.
- Produces: `export default function WeeklyGoalBar({ count, goal, pct }: { count: number; goal: number; pct: number })`.

Client component with `useActionState` + Recharts-free markup. No unit test (hooks + form action); verified by build in Task 15.

- [ ] **Step 1: Write the component**

Create `components/WeeklyGoalBar.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import { updateWeeklyGoal, type GoalFormState } from '@/app/(app)/dashboard/actions';

const initialState: GoalFormState = {};

export default function WeeklyGoalBar({
  count,
  goal,
  pct,
}: {
  count: number;
  goal: number;
  pct: number;
}) {
  const [state, formAction, pending] = useActionState(updateWeeklyGoal, initialState);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">This week</h2>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {count} / {goal} applications
        </span>
      </div>

      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"
        role="progressbar"
        aria-valuenow={count}
        aria-valuemin={0}
        aria-valuemax={goal}
      >
        <div className="h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
      </div>

      <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
        <label htmlFor="weekly-goal" className="text-xs text-gray-500 dark:text-gray-400">
          Weekly goal
        </label>
        <input
          id="weekly-goal"
          name="goal"
          type="number"
          min={1}
          max={100}
          defaultValue={goal}
          className="w-16 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        {state.error && (
          <span role="alert" className="text-xs text-red-600 dark:text-red-400">
            {state.error}
          </span>
        )}
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint components/WeeklyGoalBar.tsx`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/WeeklyGoalBar.tsx
git commit -m "feat: WeeklyGoalBar component with inline goal editor"
```

---

## Task 14: `StageDwellChart` component

**Files:**
- Create: `components/StageDwellChart.tsx`

**Interfaces:**
- Consumes: `StageDwell` type from `lib/metrics.ts`.
- Produces: `export default function StageDwellChart({ data }: { data: StageDwell[] })`.

Client Recharts component modelled on `components/StatusBreakdownChart.tsx`. No unit test (Recharts renders nothing meaningful under `renderToStaticMarkup`); verified by build in Task 15.

- [ ] **Step 1: Write the component**

Create `components/StageDwellChart.tsx`:

```tsx
'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { StageDwell } from '@/lib/metrics';

export default function StageDwellChart({ data }: { data: StageDwell[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-400">Not enough history yet.</p>;
  }

  const rows = data.map((d) => ({
    stage: d.stage,
    days: Math.round(d.medianDays * 10) / 10,
    count: d.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart layout="vertical" data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" fontSize={12} allowDecimals />
        <YAxis type="category" dataKey="stage" fontSize={11} width={110} />
        <Tooltip
          formatter={(value, _name, item) => [
            `${value as number} days (${(item?.payload as { count?: number })?.count ?? 0} applications)`,
            'Median',
          ]}
        />
        <Bar dataKey="days" fill="#2563eb" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint components/StageDwellChart.tsx`
Expected: no errors. If the `Tooltip` `formatter` types complain, simplify the callback body but keep the `[text, 'Median']` tuple return shape.

- [ ] **Step 3: Commit**

```bash
git add components/StageDwellChart.tsx
git commit -m "feat: StageDwellChart component"
```

---

## Task 15: Wire the metrics into the dashboard

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `getAllApplicationEvents` (Task 9), `getWeeklyGoal` (Task 10), `medianDaysToFirstResponse` / `medianDaysInStage` / `weeklyProgress` / `streak` (Tasks 2–5), `formatDays` (Task 6), `WeeklyGoalBar` / `StreakCard` / `StageDwellChart` (Tasks 12–14), `ApplicationEvent` type (Task 1).
- Produces: the finished dashboard. No new exports.

- [ ] **Step 1: Replace the file**

Overwrite `app/(app)/dashboard/page.tsx` with:

```tsx
import AppsOverTimeChart from '@/components/AppsOverTimeChart';
import SankeyFlow from '@/components/SankeyFlow';
import StageDwellChart from '@/components/StageDwellChart';
import StatCard from '@/components/StatCard';
import StatusBreakdownChart from '@/components/StatusBreakdownChart';
import StreakCard from '@/components/StreakCard';
import WeeklyGoalBar from '@/components/WeeklyGoalBar';
import { getAllApplications } from '@/lib/applications';
import { getAllApplicationEvents } from '@/lib/events';
import { computeFlow } from '@/lib/flow';
import { formatDays, formatPercent, formatUSD } from '@/lib/format';
import {
  medianDaysInStage,
  medianDaysToFirstResponse,
  streak,
  weeklyProgress,
} from '@/lib/metrics';
import { getWeeklyGoal } from '@/lib/settings';
import { computeStats } from '@/lib/stats';
import { DEFAULT_WEEKLY_GOAL, type Application, type ApplicationEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

const cardClass =
  'rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900';
const cardHeading = 'mb-2 text-sm font-medium text-gray-700 dark:text-gray-300';

export default async function DashboardPage() {
  let applications: Application[] = [];
  let events: ApplicationEvent[] = [];
  let weeklyGoal = DEFAULT_WEEKLY_GOAL;
  let loadError: string | null = null;
  try {
    [applications, events, weeklyGoal] = await Promise.all([
      getAllApplications(),
      getAllApplicationEvents(),
      getWeeklyGoal(),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'Failed to load dashboard.';
  }

  if (loadError) {
    return (
      <section className="space-y-4">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
        >
          {loadError}
        </p>
      </section>
    );
  }

  const stats = computeStats(applications);
  const now = new Date();
  const medianResponseDays = medianDaysToFirstResponse(events);
  const stageDwell = medianDaysInStage(events, now);
  const weekly = weeklyProgress(applications, now, weeklyGoal);
  const streakStats = streak(applications, now);

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <StatCard label="Total applications" value={String(stats.total)} />
        <StatCard label="Open positions" value={String(stats.open)} />
        <StatCard
          label="Interviews"
          value={String(stats.interviews.count)}
          sub={`${formatPercent(stats.interviews.rate)} of total`}
        />
        <StatCard
          label="Offers"
          value={String(stats.offers.count)}
          sub={`${formatPercent(stats.offers.rate)} of total`}
        />
        <StatCard
          label="Rejections"
          value={String(stats.rejections.count)}
          sub={`${formatPercent(stats.rejections.rate)} of total`}
        />
        <StatCard label="Avg salary" value={formatUSD(stats.avgSalary)} sub="midpoint of ranges" />
        <StatCard
          label="Median time to first response"
          value={formatDays(medianResponseDays)}
          sub="from applying to first reply"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <WeeklyGoalBar count={weekly.count} goal={weekly.goal} pct={weekly.pct} />
        <StreakCard current={streakStats.current} longest={streakStats.longest} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className={cardClass}>
          <h2 className={cardHeading}>Applications over time</h2>
          <AppsOverTimeChart data={stats.overTime} />
        </div>
        <div className={cardClass}>
          <h2 className={cardHeading}>Status breakdown</h2>
          <StatusBreakdownChart data={stats.statusBreakdown} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className={cardClass}>
          <h2 className={cardHeading}>Time in each stage</h2>
          <StageDwellChart data={stageDwell} />
        </div>
        <div className={cardClass}>
          <h2 className={cardHeading}>Application flow</h2>
          <SankeyFlow data={computeFlow(applications)} />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Regenerate route types and typecheck**

Run: `npx next typegen && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npx eslint .`
Expected: clean.

- [ ] **Step 4: Full unit test run**

Run: `npx vitest run`
Expected: all suites pass (existing + `types`, `metrics`, `format`, `validation`, `streak-card`).

- [ ] **Step 5: Production build**

Run: `npx next build`
Expected: compiles; route list still shows `/dashboard` as `ƒ (Dynamic)`.

- [ ] **Step 6: Manual smoke (if a dev environment with Supabase is available)**

Run `npm run dev`, sign in, open `/dashboard`. Confirm:
- "Median time to first response" stat card renders ("—" on fresh data is fine).
- "This week" bar reflects applications added since Monday; changing the number and clicking Save persists after reload.
- "Streak" shows the current run of consecutive days.
- "Time in each stage" shows bars once at least one application has changed status post-migration (empty-state text otherwise).
- Change an application's status on `/applications`, return to `/dashboard`, confirm the stage/response metrics update.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/dashboard/page.tsx"
git commit -m "feat: surface response-time, stage-time, weekly goal and streak on the dashboard"
```

---

## Self-Review

**1. Spec coverage**

| Spec section | Task(s) |
|---|---|
| `application_events` table + trigger + backfill + RLS | 7 |
| `user_settings` table + RLS | 8 |
| Types (`ApplicationEvent`, `UserSettings`, `RESPONSE_STATUSES`, `TIMED_STAGES`, `DEFAULT_WEEKLY_GOAL`) | 1 |
| `getAllApplicationEvents` | 9 |
| `getWeeklyGoal` / `setWeeklyGoal` | 10 |
| `updateWeeklyGoal` action + zod 1–100 | 11 |
| `median` | 2 |
| `medianDaysToFirstResponse` | 2 |
| `medianDaysInStage` (incl. ≥2-events guard on open stage) | 3 |
| `weeklyProgress` (Monday week start) | 4 |
| `streak` (alive today-or-yesterday) | 5 |
| `formatDays` | 6 |
| Median-response StatCard | 15 |
| `WeeklyGoalBar` | 13 + 15 |
| `StreakCard` | 12 + 15 |
| `StageDwellChart` | 14 + 15 |
| Dashboard data flow (`Promise.all`, existing try/catch) | 15 |
| Testing (`tests/metrics.test.ts` cases) | 2–5 |
| Known limitations (timezone, warm-up, rapid edits) | inherent in the implementations; no code needed |

No gaps.

**2. Placeholder scan**

No "TBD"/"TODO"/"handle edge cases"/"similar to Task N". Every code step has complete code. Migration and data-access tasks legitimately have no unit test (documented, matches repo convention) and instead specify typecheck / SQL-review / build verification.

**3. Type consistency**

- `StageDwell { stage: Status; medianDays: number; count: number }` — defined in Task 3, imported by Task 14, produced by Task 3's function used in Task 15. Consistent.
- `GoalFormState { error?: string; ok?: boolean }` — defined Task 11, consumed Task 13. Consistent.
- `WeeklyProgress` fields (`count`, `goal`, `pct`, `weekStart`) — Task 4 defines; Task 15 reads `weekly.count/goal/pct`. Consistent.
- `streak` return `{ current, longest }` — Task 5 defines; Task 12/15 read `.current` / `.longest`. Consistent.
- `getWeeklyGoal(): Promise<number>` — Task 10; Task 15 destructures it as the third `Promise.all` element into `weeklyGoal: number`. Consistent.
- `medianDaysInStage(events, now)` signature — Task 3 defines two args; Task 15 calls with `(events, now)`. Consistent.
- `ApplicationEvent.changed_at: string` — Task 1; parsed with `Date.parse` in Task 2/3. Consistent.
- `vitest.config.mts` include widened to `.{ts,tsx}` in Task 12 before the first `.tsx` test. Ordering correct.

No inconsistencies.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-31-dashboard-metrics.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
