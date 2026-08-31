# Dashboard Metrics — Design Spec

Date: 2026-08-31
Status: Approved for planning

## Purpose

Add four new insights to the dashboard:

1. **Median time to first response** — how long, typically, from applying to the
   first real reply from an employer.
2. **Time spent in each stage** — median days an application sits in each active
   stage (Applied, Online Assessment, Interview, Offer). Terminal states
   (Rejected, Ghosted, Withdrawn, N/A) are not measured.
3. **Applications-per-week goal bar** — progress toward a user-set weekly target.
4. **Streak widget** — consecutive calendar days with at least one application.

Metrics 1 and 2 require per-application status history, which does not exist
today. This spec adds an append-only event log for that history.

## Scope

In scope:

- New `application_events` table + trigger + backfill.
- New `user_settings` table for the weekly goal.
- New pure metric functions with unit tests.
- Four new dashboard UI elements and their data wiring.
- One server action to update the weekly goal.

Out of scope:

- A dedicated settings page (goal is edited inline on the dashboard).
- Editing or deleting event history from the UI.
- Per-user timezone handling (see Known Limitations).
- Backfilling accurate historical transition dates for existing applications.

## Data Model

### New table: `application_events`

Append-only log of every status change to an application.

| Column | Type | Constraints / Notes |
|---|---|---|
| `id` | uuid | primary key, default `gen_random_uuid()` |
| `application_id` | uuid | not null, references `applications(id)` on delete cascade |
| `user_id` | uuid | not null, references `auth.users(id)` on delete cascade |
| `from_status` | text | nullable (null = application was just created) |
| `to_status` | text | not null |
| `changed_at` | timestamptz | not null — when the transition happened |
| `created_at` | timestamptz | not null, default `now()` — when the row was written |

- Index: `application_events_user_app_idx (user_id, application_id, changed_at)`.
- `from_status` / `to_status` are plain text (no CHECK) — they mirror whatever
  `applications.status` allowed at the time, and historical values must remain
  valid even if the status list changes later.

#### Trigger: `tg_applications_log_event`

`AFTER INSERT OR UPDATE ON public.applications FOR EACH ROW`, `SECURITY DEFINER`:

- **INSERT**: write `(application_id = NEW.id, user_id = NEW.user_id,
  from_status = NULL, to_status = NEW.status,
  changed_at = NEW.application_date::timestamptz)`.
- **UPDATE** where `NEW.status IS DISTINCT FROM OLD.status`: write
  `(from_status = OLD.status, to_status = NEW.status, changed_at = now())`.
- **UPDATE** with no status change: no-op.

`SECURITY DEFINER` so the insert bypasses `application_events` RLS; users never
write to the table directly.

#### Backfill (in the same migration, after the trigger exists)

For every existing `applications` row, insert one seed event:
`(from_status = NULL, to_status = 'Applied', changed_at = application_date::timestamptz)`.

Rationale: we cannot know when historical apps moved between stages. Seeding only
the initial "Applied" event keeps the data trustworthy — an existing application
begins contributing to time-based metrics only once it changes status again
(producing a second, real event). This is an accepted tradeoff; the metrics
"warm up" over the weeks after deployment.

Note: the seed events use `to_status = 'Applied'` even for apps whose current
status is not "Applied". That is intentional — it marks the application's start
without inventing transition dates. The current status is still available from
`applications.status`.

#### RLS

- RLS enabled.
- `select` policy: `USING (auth.uid() = user_id)`.
- No `insert` / `update` / `delete` policies — the `SECURITY DEFINER` trigger is
  the only writer.

### New table: `user_settings`

| Column | Type | Constraints / Notes |
|---|---|---|
| `user_id` | uuid | primary key, references `auth.users(id)` on delete cascade |
| `weekly_goal` | integer | not null, default `5`, `CHECK (weekly_goal BETWEEN 1 AND 100)` |
| `created_at` | timestamptz | not null, default `now()` |
| `updated_at` | timestamptz | not null, default `now()`, maintained by trigger |

- Trigger `tg_user_settings_updated_at` sets `updated_at = now()` on UPDATE.
- RLS enabled. Policies for `select`, `insert`, `update` each with
  `auth.uid() = user_id` (USING and/or WITH CHECK). No `delete` policy.
- A user with no row is treated as `weekly_goal = 5` by the data layer.

### `applications` table

Unchanged.

## Types (`lib/types.ts`)

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

// A status that represents an employer response to an application.
export const RESPONSE_STATUSES: readonly Status[] = [
  'Online Assessment',
  'Interview',
  'Offer',
  'Rejected',
];

// Stages whose dwell time we measure. Excludes terminal / non-progress states.
export const TIMED_STAGES: readonly Status[] = [
  'Applied',
  'Online Assessment',
  'Interview',
  'Offer',
];

export const DEFAULT_WEEKLY_GOAL = 5;
```

## Data Access

### `lib/events.ts`

```ts
export async function getAllApplicationEvents(): Promise<ApplicationEvent[]>
```

`select *` from `application_events` (RLS scopes to the user), ordered by
`changed_at` ascending, then `created_at` ascending as a tiebreaker.

### `lib/settings.ts`

```ts
export async function getWeeklyGoal(): Promise<number>       // DEFAULT_WEEKLY_GOAL if no row
export async function setWeeklyGoal(goal: number): Promise<void>  // upsert on user_id
```

`setWeeklyGoal` assumes `goal` is already validated (1–100); it upserts
`{ user_id, weekly_goal }` with `onConflict: 'user_id'`.

### `app/(app)/dashboard/actions.ts` (new file)

```ts
export async function updateWeeklyGoal(_prev: FormState, formData: FormData): Promise<FormState>
```

- Parse `goal` with a zod schema: `z.coerce.number().int().min(1).max(100)`.
- On failure return `{ error: 'Enter a whole number from 1 to 100.' }`.
- On success call `setWeeklyGoal`, then `revalidatePath('/dashboard')`, return `{}`.
- `FormState = { error?: string }`.

## Metrics (`lib/metrics.ts` — pure functions, unit-tested)

All functions take already-fetched data plus an explicit `now: Date` where time
matters, so tests are deterministic.

### `median(values: number[]): number | null`

Sorted-middle for odd length, mean of the two middles for even, `null` for empty.

### `medianDaysToFirstResponse(events: ApplicationEvent[]): number | null`

1. Group events by `application_id`.
2. For each app: `appliedAt` = the earliest event's `changed_at`. `respondedAt`
   = the earliest event with `to_status ∈ RESPONSE_STATUSES` (skip the app if
   none). Ignore `Ghosted` and `Withdrawn` — they are not responses.
3. `days = (respondedAt − appliedAt) / 86_400_000`, clamped to `>= 0`.
4. Return `median` of all `days`. `null` if no app has responded.

### `medianDaysInStage(events, now): StageDwell[]`

`StageDwell = { stage: Status; medianDays: number; count: number }`

1. Group by `application_id`, sort each group by `changed_at`.
2. For each consecutive pair `(e[i], e[i+1])`: if `e[i].to_status ∈ TIMED_STAGES`,
   add `(e[i+1].changed_at − e[i].changed_at) / 86_400_000` to that stage's
   sample list.
3. For the last event `e[n]`: if `e[n].to_status ∈ TIMED_STAGES`, add
   `(now − e[n].changed_at) / 86_400_000` (the application is currently sitting
   in that stage). If `e[n].to_status` is terminal, add nothing.
4. For each stage in `TIMED_STAGES` order with a non-empty sample list, emit
   `{ stage, medianDays: median(samples), count: samples.length }`. Drop stages
   with no samples.

### `weeklyProgress(apps: Application[], now: Date, goal: number): WeeklyProgress`

`WeeklyProgress = { count: number; goal: number; pct: number; weekStart: string }`

- `weekStart` = most recent Monday at 00:00:00 local time, as `YYYY-MM-DD`.
- `count` = applications whose `application_date` (a `YYYY-MM-DD` string) is
  `>= weekStart` and `<= today`.
- `pct` = `Math.min(100, Math.round((count / goal) * 100))`.

### `streak(apps: Application[], now: Date): Streak`

`Streak = { current: number; longest: number }`

- Build a `Set` of distinct `application_date` strings.
- `longest` = the longest run of consecutive calendar days present in the set.
- `current` = starting from today: if today is in the set, count today and walk
  backward while each previous day is present. If today is absent but yesterday
  is present, start from yesterday instead (the streak is still "alive" today).
  If neither today nor yesterday is present, `current = 0`.
- Empty input → `{ current: 0, longest: 0 }`.

### `lib/format.ts` addition

```ts
export function formatDays(n: number | null): string
```

`null` → `"—"`. `< 1` → `"<1 day"`. `1` → `"1 day"`. Otherwise
`` `${Math.round(n)} days` ``.

## UI

All new elements match the existing dashboard card styling
(`rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:...`).

### Median time to first response

Add one `StatCard` to the existing stat-card grid in
`app/(app)/dashboard/page.tsx`:

```tsx
<StatCard
  label="Median time to first response"
  value={formatDays(metrics.medianResponseDays)}
  sub="from applying to first reply"
/>
```

### `components/WeeklyGoalBar.tsx` (client component)

- Card titled **"This week"**.
- Progress bar: filled width = `pct`%, `bg-blue-600`, on a
  `bg-gray-200 dark:bg-gray-800` track.
- Caption: `` `${count} / ${goal} applications` ``.
- Inline goal editor: a small `<form>` with `useActionState(updateWeeklyGoal)`,
  a `number` input (`min=1 max=100`, defaulting to current `goal`) and a "Save"
  button. Error text rendered from `state.error`.

### `components/StreakCard.tsx` (server component)

- Card titled **"Streak"**.
- Big number: `current` with the word "day" / "days".
- Sub text: `` `Best: ${longest} ${longest === 1 ? 'day' : 'days'}` ``.
- When `current === 0`: show `0 days` and sub `"Add an application to start a streak"`.

### `components/StageDwellChart.tsx` (client component, Recharts)

- Card titled **"Time in each stage"**.
- Horizontal bar chart (`layout="vertical"`), one bar per `StageDwell` entry,
  X = median days, Y = stage name. Bar fill `#2563eb` (blue-600), matching the
  other charts. Tooltip shows `"<stage>: <n> days (<count> applications)"`.
- Empty state (no entries): a muted `"Not enough history yet."` paragraph,
  same pattern as other charts' empty states.

### Layout in `page.tsx`

- The new `StatCard` joins the existing 6-card grid (it becomes 7; the grid
  already wraps responsively).
- Directly below the stat grid: a `grid gap-6 lg:grid-cols-2` row containing
  `WeeklyGoalBar` and `StreakCard`.
- `StageDwellChart` is added as a third card in the existing charts area (it can
  sit in the same grid as "Applications over time" / "Status breakdown", or
  full-width below them — implementer's choice, keep it visually balanced).

## Dashboard Data Flow

`app/(app)/dashboard/page.tsx` (server component, already `force-dynamic`):

```
const [applications, events, weeklyGoal] = await Promise.all([
  getAllApplications(),
  getAllApplicationEvents(),
  getWeeklyGoal(),
]);
```

Wrap in the existing `try/catch`; on error show the current error panel.

Then compute:

```
const medianResponseDays = medianDaysToFirstResponse(events);
const stageDwell        = medianDaysInStage(events, new Date());
const weekly            = weeklyProgress(applications, new Date(), weeklyGoal);
const streakStats       = streak(applications, new Date());
```

Pass to the components. `computeStats` / `computeFlow` usage is unchanged.

## Error Handling

- Data-access functions throw on Supabase error (matches `lib/applications.ts`);
  the dashboard's existing `try/catch` renders the error panel.
- `getWeeklyGoal` treats "no row" as the default, not an error.
- `updateWeeklyGoal` returns a `{ error }` string for invalid input; never throws
  for user error.
- Metric functions never throw: missing or sparse data yields `null` or empty
  arrays, which the UI renders as "—" / empty states.

## Testing

### `tests/metrics.test.ts` (new)

- `median`: odd, even, single, empty (`null`).
- `medianDaysToFirstResponse`:
  - one app, Applied → Interview after 3 days → `3`.
  - app that only went Applied → Ghosted → excluded (no response).
  - app Applied → Withdrawn → excluded.
  - app with multiple responses → uses the earliest.
  - no apps have responded → `null`.
  - even number of responded apps → mean of two middles.
- `medianDaysInStage`:
  - app Applied(0) → OA(2) → Interview(5) → Offer(10), `now` = day 12:
    Applied 2, OA 3, Interview 5, Offer 2 (open).
  - app Applied → Rejected: Applied stage gets its dwell; Rejected contributes
    nothing.
  - stage with no samples is absent from the result.
  - result is ordered `Applied, Online Assessment, Interview, Offer`.
- `weeklyProgress`:
  - `now` = Wednesday; apps on Mon/Tue/Wed count, app on the prior Sunday does not.
  - `count` past `goal` → `pct` capped at 100.
  - `goal` respected from the argument.
- `streak`:
  - apps today, yesterday, day-before → `current = 3`.
  - nothing today, app yesterday and the day before → `current = 2` (alive).
  - nothing today or yesterday → `current = 0`, `longest` still reflects history.
  - longest run is earlier than the current run.
  - empty → `{ current: 0, longest: 0 }`.

### Existing tests

- `tests/*` and `e2e/app.spec.ts` unchanged and still passing.

## Migrations — manual apply

`supabase/migrations/0004_application_events.sql` and
`0005_user_settings.sql`. Applied the same way as existing migrations
(`npx supabase db push` or pasting into the Supabase SQL editor). The backfill
runs once as part of `0004`. Add a one-line note to `README.md` if the migration
list there is enumerated.

## Known Limitations

- **Timezone**: "today" / "this week" use the server's local time, not the
  user's. Acceptable for a personal tracker; documented here.
- **Historical accuracy**: applications created before this feature have no
  intermediate transition history, so they contribute to time-in-stage and
  time-to-response metrics only after their next status change.
- **`changed_at` for rapid edits**: if a user changes status twice in quick
  succession, both events are recorded with near-equal timestamps, yielding a
  near-zero dwell for the middle stage. This is correct behavior.

## File Summary

New:

- `supabase/migrations/0004_application_events.sql`
- `supabase/migrations/0005_user_settings.sql`
- `lib/events.ts`
- `lib/settings.ts`
- `lib/metrics.ts`
- `app/(app)/dashboard/actions.ts`
- `components/WeeklyGoalBar.tsx`
- `components/StreakCard.tsx`
- `components/StageDwellChart.tsx`
- `tests/metrics.test.ts`

Modified:

- `lib/types.ts` — new interfaces + constants
- `lib/format.ts` — `formatDays`
- `app/(app)/dashboard/page.tsx` — load events + goal, compute metrics, render
  new components
- `README.md` — migration note (if applicable)
