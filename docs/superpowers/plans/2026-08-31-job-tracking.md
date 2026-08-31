# Job Tracking Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private single-user web app to record job applications, track their status, view aggregate stats, and automatically route rejected applications to a dedicated page.

**Architecture:** Next.js App Router with React Server Components for reads and server actions for writes. Supabase Postgres stores one `applications` table protected by Row Level Security; Supabase Auth handles the single user. Dashboard stats are computed in pure TypeScript from a single fetch of all rows. Deployed to Vercel.

**Tech Stack:** Next.js 15 (App Router, TypeScript), React 19, `@supabase/ssr` + `@supabase/supabase-js`, Tailwind CSS, Recharts, zod, Vitest (unit), Playwright (one E2E flow).

**Spec:** `docs/superpowers/specs/2026-08-31-job-tracking-design.md`

## Global Constraints

- Node 20+ / npm. Platform: Windows (PowerShell). Use forward-slash paths in code; npm scripts are cross-platform.
- Next.js App Router only. No `src/` directory. Import alias `@/*` maps to project root.
- All application data access goes through Supabase with RLS enabled. Never use the service-role key in app code. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are used.
- Status values, exactly: `Applied`, `Online Assessment`, `Interview`, `Offer`, `Rejected`, `Withdrawn`, `Ghosted`.
- "Closed" statuses (excluded from Open count): `Rejected`, `Withdrawn`, `Ghosted`.
- Salary is integer USD only. `salary_min`/`salary_max` nullable. If both set, `salary_max >= salary_min`.
- `application_date` required, must not be in the future.
- Rejected applications are the same rows, filtered by `status = 'Rejected'`. `/applications` shows `status <> 'Rejected'`; `/rejected` shows `status = 'Rejected'`.
- Visual style: clean light dashboard — white/light-gray surfaces, one blue accent (`blue-600`), card-based stats.
- Unit tests use relative imports (`../lib/...`) so no path-alias plugin is needed in Vitest.

---

## File Structure

```
app/
  layout.tsx                  Root layout, Nav, global styles
  globals.css                 Tailwind directives + base tokens
  page.tsx                    Dashboard (stats + charts)
  error.tsx                   Route error boundary
  not-found.tsx               404
  login/
    page.tsx                  Login form (client)
    actions.ts                login / logout server actions
  applications/
    page.tsx                  Active applications table
    actions.ts                create / update / delete server actions
    new/page.tsx              Create form page
    [id]/edit/page.tsx        Edit form page
  rejected/
    page.tsx                  Rejected applications table
components/
  Nav.tsx                     Top nav + sign-out
  StatCard.tsx                One dashboard metric
  StatusBadge.tsx             Colored status pill
  DeleteButton.tsx            Delete with confirm (client)
  ApplicationForm.tsx         Create/edit form (client, useActionState)
  ApplicationsTable.tsx       Table of applications
  AppsOverTimeChart.tsx       Recharts bar chart, apps per month
  StatusBreakdownChart.tsx    Recharts bar chart, count per status
lib/
  types.ts                    Application type, STATUS_VALUES, Status
  validation.ts               zod schema, FormData parsing, error flattening
  stats.ts                    computeStats + result types (pure)
  applications.ts             server-side query helpers
  supabase/
    client.ts                 browser client
    server.ts                 server component / action client
    middleware.ts             session refresh + route guard
middleware.ts                 wires lib/supabase/middleware
supabase/
  migrations/
    0001_applications.sql     table, constraints, trigger, RLS
tests/
  validation.test.ts
  stats.test.ts
e2e/
  app.spec.ts
.env.local.example
vitest.config.ts
playwright.config.ts
README.md
```

---

## Task 1: Scaffold project and tooling

**Files:**
- Create: whole Next.js project skeleton (via `create-next-app`)
- Create: `vitest.config.ts`
- Create: `tests/smoke.test.ts`
- Create: `.env.local.example`
- Create: `.gitignore` additions (create-next-app provides most)
- Modify: `package.json` (scripts, deps)

**Interfaces:**
- Consumes: nothing
- Produces: a buildable Next.js app; `npm test` runs Vitest; `npm run e2e` runs Playwright; import alias `@/*`.

- [ ] **Step 1: Scaffold Next.js**

Run in the project root (which already contains `.git/` and `docs/`):

```bash
npx --yes create-next-app@latest . --ts --tailwind --app --eslint --no-src-dir --import-alias "@/*" --use-npm --no-turbopack
```

If prompted for anything not covered by a flag (e.g. React Compiler), accept the default (No). If it refuses due to existing files, confirm only `.git/` and `docs/` are present and re-run; those do not conflict.

- [ ] **Step 2: Add dependencies**

```bash
npm install @supabase/ssr @supabase/supabase-js zod recharts
npm install -D vitest @playwright/test
npx playwright install chromium
```

- [ ] **Step 3: Add npm scripts**

In `package.json`, set the `scripts` block to:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest",
  "e2e": "playwright test"
}
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: Create `.env.local.example`**

```bash
# Copy to .env.local and fill in from your Supabase project settings (API section)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

- [ ] **Step 6: Write the smoke test**

`tests/smoke.test.ts`:

```ts
import { expect, test } from 'vitest';

test('vitest is wired up', () => {
  expect(1 + 1).toBe(2);
});
```

- [ ] **Step 7: Run the smoke test**

Run: `npm test`
Expected: PASS, 1 test.

- [ ] **Step 8: Verify the build**

Run: `npm run build`
Expected: build succeeds (the default create-next-app page still exists; that is fine).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Vitest and Playwright"
```

---

## Task 2: Domain types and validation schema

**Files:**
- Create: `lib/types.ts`
- Create: `lib/validation.ts`
- Test: `tests/validation.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `STATUS_VALUES: readonly Status[]` and `type Status`
  - `interface Application` (all DB columns)
  - `applicationSchema` (zod) with output type `ApplicationInput`
  - `parseApplicationForm(fd: FormData): Record<string, unknown>`
  - `toRow(input: ApplicationInput): { company_name: string; job_title: string; location: string | null; salary_min: number | null; salary_max: number | null; application_date: string; status: Status; dashboard_url: string | null; notes: string | null }`
  - `flattenErrors(err: ZodError): Record<string, string>`

- [ ] **Step 1: Write `lib/types.ts`**

```ts
export const STATUS_VALUES = [
  'Applied',
  'Online Assessment',
  'Interview',
  'Offer',
  'Rejected',
  'Withdrawn',
  'Ghosted',
] as const;

export type Status = (typeof STATUS_VALUES)[number];

export const CLOSED_STATUSES: readonly Status[] = ['Rejected', 'Withdrawn', 'Ghosted'];

export interface Application {
  id: string;
  user_id: string;
  company_name: string;
  job_title: string;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  application_date: string; // 'YYYY-MM-DD'
  status: Status;
  dashboard_url: string | null;
  notes: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Write the failing validation tests**

`tests/validation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { applicationSchema, flattenErrors, parseApplicationForm, toRow } from '../lib/validation';

const base = {
  company_name: 'Acme',
  job_title: 'Engineer',
  location: '',
  salary_min: '',
  salary_max: '',
  application_date: '2020-01-01',
  status: 'Applied',
  dashboard_url: '',
  notes: '',
};

describe('applicationSchema', () => {
  it('accepts a minimal valid application', () => {
    const r = applicationSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it('requires company_name and job_title', () => {
    const r = applicationSchema.safeParse({ ...base, company_name: '  ', job_title: '' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const errs = flattenErrors(r.error);
      expect(errs.company_name).toBeTruthy();
      expect(errs.job_title).toBeTruthy();
    }
  });

  it('rejects a future application_date', () => {
    const r = applicationSchema.safeParse({ ...base, application_date: '2999-01-01' });
    expect(r.success).toBe(false);
  });

  it('rejects an invalid application_date', () => {
    const r = applicationSchema.safeParse({ ...base, application_date: 'not-a-date' });
    expect(r.success).toBe(false);
  });

  it('rejects salary_max less than salary_min', () => {
    const r = applicationSchema.safeParse({ ...base, salary_min: '100000', salary_max: '80000' });
    expect(r.success).toBe(false);
    if (!r.success) expect(flattenErrors(r.error).salary_max).toBeTruthy();
  });

  it('accepts only salary_min with no salary_max', () => {
    const r = applicationSchema.safeParse({ ...base, salary_min: '90000' });
    expect(r.success).toBe(true);
  });

  it('rejects negative salary', () => {
    const r = applicationSchema.safeParse({ ...base, salary_min: '-5' });
    expect(r.success).toBe(false);
  });

  it('rejects a non-http dashboard_url', () => {
    const r = applicationSchema.safeParse({ ...base, dashboard_url: 'ftp://x.y' });
    expect(r.success).toBe(false);
  });

  it('accepts a valid https dashboard_url', () => {
    const r = applicationSchema.safeParse({ ...base, dashboard_url: 'https://jobs.acme.com/123' });
    expect(r.success).toBe(true);
  });

  it('rejects an unknown status', () => {
    const r = applicationSchema.safeParse({ ...base, status: 'Maybe' });
    expect(r.success).toBe(false);
  });
});

describe('toRow', () => {
  it('maps empty optionals to null and keeps required fields', () => {
    const parsed = applicationSchema.parse(base);
    const row = toRow(parsed);
    expect(row).toEqual({
      company_name: 'Acme',
      job_title: 'Engineer',
      location: null,
      salary_min: null,
      salary_max: null,
      application_date: '2020-01-01',
      status: 'Applied',
      dashboard_url: null,
      notes: null,
    });
  });

  it('keeps provided optional values', () => {
    const parsed = applicationSchema.parse({
      ...base,
      location: 'Remote',
      salary_min: '80000',
      salary_max: '120000',
      dashboard_url: 'https://x.com/a',
      notes: 'referred by a friend',
    });
    const row = toRow(parsed);
    expect(row.location).toBe('Remote');
    expect(row.salary_min).toBe(80000);
    expect(row.salary_max).toBe(120000);
    expect(row.dashboard_url).toBe('https://x.com/a');
    expect(row.notes).toBe('referred by a friend');
  });
});

describe('parseApplicationForm', () => {
  it('reads all fields from FormData with empty-string defaults', () => {
    const fd = new FormData();
    fd.set('company_name', 'Acme');
    fd.set('job_title', 'Engineer');
    fd.set('application_date', '2020-01-01');
    fd.set('status', 'Applied');
    const obj = parseApplicationForm(fd);
    expect(obj).toMatchObject({
      company_name: 'Acme',
      job_title: 'Engineer',
      location: '',
      salary_min: '',
      salary_max: '',
      application_date: '2020-01-01',
      status: 'Applied',
      dashboard_url: '',
      notes: '',
    });
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `lib/validation` not found.

- [ ] **Step 4: Write `lib/validation.ts`**

```ts
import { z } from 'zod';
import { STATUS_VALUES } from './types';

const emptyToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

function isValidNonFutureDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return d.getTime() <= endOfToday.getTime();
}

export const applicationSchema = z
  .object({
    company_name: z.string().trim().min(1, 'Company name is required'),
    job_title: z.string().trim().min(1, 'Job title is required'),
    location: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
    salary_min: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int('Must be a whole number').nonnegative('Cannot be negative').optional(),
    ),
    salary_max: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int('Must be a whole number').nonnegative('Cannot be negative').optional(),
    ),
    application_date: z.string().refine(isValidNonFutureDate, 'Must be a valid date, not in the future'),
    status: z.enum(STATUS_VALUES),
    dashboard_url: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .url('Must be a valid URL')
        .refine((u) => /^https?:\/\//i.test(u), 'Must start with http:// or https://')
        .optional(),
    ),
    notes: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  })
  .refine(
    (d) => d.salary_min === undefined || d.salary_max === undefined || d.salary_max >= d.salary_min,
    { message: 'Max salary must be greater than or equal to min salary', path: ['salary_max'] },
  );

export type ApplicationInput = z.infer<typeof applicationSchema>;

export function parseApplicationForm(fd: FormData): Record<string, unknown> {
  const get = (k: string) => {
    const v = fd.get(k);
    return typeof v === 'string' ? v : '';
  };
  return {
    company_name: get('company_name'),
    job_title: get('job_title'),
    location: get('location'),
    salary_min: get('salary_min'),
    salary_max: get('salary_max'),
    application_date: get('application_date'),
    status: get('status') || 'Applied',
    dashboard_url: get('dashboard_url'),
    notes: get('notes'),
  };
}

export function toRow(input: ApplicationInput) {
  return {
    company_name: input.company_name,
    job_title: input.job_title,
    location: input.location ?? null,
    salary_min: input.salary_min ?? null,
    salary_max: input.salary_max ?? null,
    application_date: input.application_date,
    status: input.status,
    dashboard_url: input.dashboard_url ?? null,
    notes: input.notes ?? null,
  };
}

export function flattenErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — smoke + all validation tests.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/validation.ts tests/validation.test.ts
git commit -m "feat: add application domain types and zod validation"
```

---

## Task 3: Dashboard stats functions

**Files:**
- Create: `lib/stats.ts`
- Test: `tests/stats.test.ts`

**Interfaces:**
- Consumes: `Application`, `Status`, `STATUS_VALUES`, `CLOSED_STATUSES` from `lib/types.ts`
- Produces:
  - `interface Rate { count: number; rate: number }`
  - `interface MonthCount { month: string; count: number }` (`month` is `'YYYY-MM'`)
  - `interface StatusCount { status: Status; count: number }`
  - `interface DashboardStats { total: number; open: number; interviews: Rate; offers: Rate; rejections: Rate; avgSalary: number | null; overTime: MonthCount[]; statusBreakdown: StatusCount[] }`
  - `computeStats(apps: Application[]): DashboardStats`

- [ ] **Step 1: Write the failing tests**

`tests/stats.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computeStats } from '../lib/stats';
import type { Application, Status } from '../lib/types';

let seq = 0;
function app(partial: Partial<Application>): Application {
  seq += 1;
  return {
    id: `id-${seq}`,
    user_id: 'u1',
    company_name: 'Acme',
    job_title: 'Engineer',
    location: null,
    salary_min: null,
    salary_max: null,
    application_date: '2024-01-15',
    status: 'Applied' as Status,
    dashboard_url: null,
    notes: null,
    rejected_at: null,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    ...partial,
  };
}

describe('computeStats', () => {
  it('handles an empty list', () => {
    const s = computeStats([]);
    expect(s.total).toBe(0);
    expect(s.open).toBe(0);
    expect(s.interviews).toEqual({ count: 0, rate: 0 });
    expect(s.avgSalary).toBeNull();
    expect(s.overTime).toEqual([]);
    expect(s.statusBreakdown.every((b) => b.count === 0)).toBe(true);
    expect(s.statusBreakdown).toHaveLength(7);
  });

  it('counts total and open (open excludes Rejected/Withdrawn/Ghosted)', () => {
    const s = computeStats([
      app({ status: 'Applied' }),
      app({ status: 'Interview' }),
      app({ status: 'Rejected' }),
      app({ status: 'Withdrawn' }),
      app({ status: 'Ghosted' }),
    ]);
    expect(s.total).toBe(5);
    expect(s.open).toBe(2);
  });

  it('counts interviews as Interview or Offer, offers as Offer only', () => {
    const s = computeStats([
      app({ status: 'Interview' }),
      app({ status: 'Offer' }),
      app({ status: 'Applied' }),
      app({ status: 'Applied' }),
    ]);
    expect(s.interviews.count).toBe(2);
    expect(s.interviews.rate).toBeCloseTo(0.5);
    expect(s.offers.count).toBe(1);
    expect(s.offers.rate).toBeCloseTo(0.25);
  });

  it('counts rejections and rate', () => {
    const s = computeStats([app({ status: 'Rejected' }), app({ status: 'Rejected' }), app({})]);
    expect(s.rejections.count).toBe(2);
    expect(s.rejections.rate).toBeCloseTo(2 / 3);
  });

  it('averages salary midpoints, ignoring rows missing either bound', () => {
    const s = computeStats([
      app({ salary_min: 80000, salary_max: 120000 }), // midpoint 100000
      app({ salary_min: 100000, salary_max: 100000 }), // midpoint 100000
      app({ salary_min: 90000, salary_max: null }), // ignored
      app({ salary_min: null, salary_max: null }), // ignored
    ]);
    expect(s.avgSalary).toBe(100000);
  });

  it('returns null avgSalary when no row has both bounds', () => {
    const s = computeStats([app({ salary_min: 90000 }), app({})]);
    expect(s.avgSalary).toBeNull();
  });

  it('groups applications by month, sorted ascending', () => {
    const s = computeStats([
      app({ application_date: '2024-03-02' }),
      app({ application_date: '2024-01-31' }),
      app({ application_date: '2024-01-01' }),
    ]);
    expect(s.overTime).toEqual([
      { month: '2024-01', count: 2 },
      { month: '2024-03', count: 1 },
    ]);
  });

  it('produces a status breakdown covering every status value', () => {
    const s = computeStats([app({ status: 'Applied' }), app({ status: 'Applied' }), app({ status: 'Offer' })]);
    const map = Object.fromEntries(s.statusBreakdown.map((b) => [b.status, b.count]));
    expect(map.Applied).toBe(2);
    expect(map.Offer).toBe(1);
    expect(map.Rejected).toBe(0);
    expect(s.statusBreakdown).toHaveLength(7);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `lib/stats` not found.

- [ ] **Step 3: Write `lib/stats.ts`**

```ts
import { CLOSED_STATUSES, STATUS_VALUES, type Application, type Status } from './types';

export interface Rate {
  count: number;
  rate: number;
}

export interface MonthCount {
  month: string; // 'YYYY-MM'
  count: number;
}

export interface StatusCount {
  status: Status;
  count: number;
}

export interface DashboardStats {
  total: number;
  open: number;
  interviews: Rate;
  offers: Rate;
  rejections: Rate;
  avgSalary: number | null;
  overTime: MonthCount[];
  statusBreakdown: StatusCount[];
}

const rate = (count: number, total: number): Rate => ({
  count,
  rate: total === 0 ? 0 : count / total,
});

export function computeStats(apps: Application[]): DashboardStats {
  const total = apps.length;
  const count = (predicate: (a: Application) => boolean) => apps.filter(predicate).length;

  const open = count((a) => !CLOSED_STATUSES.includes(a.status));
  const interviews = count((a) => a.status === 'Interview' || a.status === 'Offer');
  const offers = count((a) => a.status === 'Offer');
  const rejections = count((a) => a.status === 'Rejected');

  const withSalary = apps.filter((a) => a.salary_min !== null && a.salary_max !== null);
  const avgSalary =
    withSalary.length === 0
      ? null
      : Math.round(
          withSalary.reduce((sum, a) => sum + ((a.salary_min as number) + (a.salary_max as number)) / 2, 0) /
            withSalary.length,
        );

  const monthMap = new Map<string, number>();
  for (const a of apps) {
    const month = a.application_date.slice(0, 7);
    monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
  }
  const overTime: MonthCount[] = [...monthMap.entries()]
    .map(([month, c]) => ({ month, count: c }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const statusBreakdown: StatusCount[] = STATUS_VALUES.map((status) => ({
    status,
    count: count((a) => a.status === status),
  }));

  return {
    total,
    open,
    interviews: rate(interviews, total),
    offers: rate(offers, total),
    rejections: rate(rejections, total),
    avgSalary,
    overTime,
    statusBreakdown,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all stats tests.

- [ ] **Step 5: Commit**

```bash
git add lib/stats.ts tests/stats.test.ts
git commit -m "feat: add dashboard stats computation"
```

---

## Task 4: Database migration

**Files:**
- Create: `supabase/migrations/0001_applications.sql`
- Modify: `README.md` (add a "Database setup" section — full README comes in Task 14; add just this section now)

**Interfaces:**
- Consumes: nothing
- Produces: `public.applications` table matching `lib/types.ts` `Application`, with RLS and a `before insert or update` trigger maintaining `updated_at` and `rejected_at`.

- [ ] **Step 1: Write the migration**

`supabase/migrations/0001_applications.sql`:

```sql
-- Job tracking: applications table, constraints, trigger, RLS.

create extension if not exists pgcrypto;

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company_name text not null check (length(trim(company_name)) > 0),
  job_title text not null check (length(trim(job_title)) > 0),
  location text,
  salary_min integer check (salary_min is null or salary_min >= 0),
  salary_max integer check (salary_max is null or salary_max >= 0),
  application_date date not null default current_date,
  status text not null default 'Applied' check (
    status in ('Applied', 'Online Assessment', 'Interview', 'Offer', 'Rejected', 'Withdrawn', 'Ghosted')
  ),
  dashboard_url text,
  notes text,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint salary_order check (
    salary_min is null or salary_max is null or salary_max >= salary_min
  )
);

create index applications_user_status_idx on public.applications (user_id, status);
create index applications_user_date_idx on public.applications (user_id, application_date desc);

create or replace function public.tg_applications_maintain()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if new.status = 'Rejected' then
    if new.rejected_at is null then
      new.rejected_at := now();
    end if;
  else
    new.rejected_at := null;
  end if;
  return new;
end;
$$;

create trigger applications_maintain
before insert or update on public.applications
for each row execute function public.tg_applications_maintain();

alter table public.applications enable row level security;

create policy "applications_select_own"
  on public.applications for select
  using (auth.uid() = user_id);

create policy "applications_insert_own"
  on public.applications for insert
  with check (auth.uid() = user_id);

create policy "applications_update_own"
  on public.applications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "applications_delete_own"
  on public.applications for delete
  using (auth.uid() = user_id);
```

- [ ] **Step 2: Apply the migration to your Supabase project**

Prerequisite: a Supabase project exists. Then either:

- **Supabase CLI** (preferred): `npx supabase link --project-ref <ref>` then `npx supabase db push`, or
- **Dashboard**: open SQL Editor, paste the migration file contents, run.

- [ ] **Step 3: Create your single user**

In the Supabase dashboard → Authentication → Users → "Add user" → create with your email and a password. Confirm the user (dashboard-created users are confirmed by default).

- [ ] **Step 4: Manually verify the schema and trigger**

In the SQL Editor, run (replace `<your-user-uuid>` with the id from step 3):

```sql
insert into public.applications (user_id, company_name, job_title, application_date)
values ('<your-user-uuid>', 'Trigger Co', 'Tester', '2024-01-01')
returning id, status, rejected_at;
-- rejected_at should be null

update public.applications set status = 'Rejected'
where company_name = 'Trigger Co'
returning status, rejected_at, updated_at;
-- rejected_at should now be set

update public.applications set status = 'Interview'
where company_name = 'Trigger Co'
returning status, rejected_at;
-- rejected_at should be null again

delete from public.applications where company_name = 'Trigger Co';
```

Expected: each `returning` matches the comment. If so, the trigger and constraints work.

- [ ] **Step 5: Add the Database setup section to README**

Create `README.md` with this content (Task 14 expands it):

```markdown
# Job Tracking

Private single-user job application tracker. Next.js + Supabase, deployed on Vercel.

## Database setup

1. Create a Supabase project at https://supabase.com.
2. Apply `supabase/migrations/0001_applications.sql`:
   - CLI: `npx supabase link --project-ref <ref>` then `npx supabase db push`
   - or paste it into the Supabase SQL Editor and run.
3. Authentication → Users → Add user: create your one account (email + password).
4. Copy `.env.local.example` to `.env.local` and fill in the URL and anon key
   from Project Settings → API.
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0001_applications.sql README.md
git commit -m "feat: add applications table migration with RLS and trigger"
```

---

## Task 5: Supabase clients and auth middleware

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`
- Create: `middleware.ts`

**Interfaces:**
- Consumes: env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Produces:
  - `lib/supabase/client.ts` → `createClient(): SupabaseClient` (browser)
  - `lib/supabase/server.ts` → `async createClient(): Promise<SupabaseClient>` (server components / actions)
  - `lib/supabase/middleware.ts` → `async updateSession(request: NextRequest): Promise<NextResponse>`
  - `middleware.ts` wires `updateSession` with a matcher

- [ ] **Step 1: Write `lib/supabase/client.ts`**

```ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 2: Write `lib/supabase/server.ts`**

```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // called from a Server Component — safe to ignore; middleware refreshes the session
          }
        },
      },
    },
  );
}
```

- [ ] **Step 3: Write `lib/supabase/middleware.ts`**

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return response;
}
```

- [ ] **Step 4: Write `middleware.ts`**

```ts
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/supabase middleware.ts
git commit -m "feat: add Supabase clients and auth middleware"
```

---

## Task 6: Login page, auth actions, and Nav

**Files:**
- Create: `app/login/actions.ts`
- Create: `app/login/page.tsx`
- Create: `components/Nav.tsx`
- Modify: `app/layout.tsx` (render Nav, set metadata, base layout)
- Modify: `app/globals.css` (keep Tailwind directives; add a `body` background)
- Delete: default marketing content in `app/page.tsx` (replaced fully in Task 12; for now leave a placeholder that redirects logic is not needed — see step)

**Interfaces:**
- Consumes: `createClient` from `lib/supabase/server.ts`
- Produces:
  - `login(prevState: AuthState, formData: FormData): Promise<AuthState>` where `type AuthState = { error?: string }`
  - `logout(): Promise<void>` (server action, redirects to `/login`)
  - `<Nav />` server component showing links + a sign-out button

- [ ] **Step 1: Write `app/login/actions.ts`**

```ts
'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type AuthState = { error?: string };

export async function login(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!email || !password) return { error: 'Email and password are required.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'Invalid email or password.' };

  redirect('/');
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
```

- [ ] **Step 2: Write `app/login/page.tsx`**

```tsx
'use client';

import { useActionState } from 'react';
import { login, type AuthState } from './actions';

const initialState: AuthState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Job Tracking</h1>
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>
        {state.error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Write `components/Nav.tsx`**

```tsx
import Link from 'next/link';
import { logout } from '@/app/login/actions';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/applications', label: 'Applications' },
  { href: '/rejected', label: 'Rejected' },
];

export default function Nav() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-gray-900">Job Tracking</span>
          <ul className="flex gap-3 text-sm">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-gray-600 hover:text-blue-700">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <form action={logout}>
          <button type="submit" className="text-sm text-gray-500 hover:text-gray-900">
            Sign out
          </button>
        </form>
      </nav>
    </header>
  );
}
```

- [ ] **Step 4: Update `app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Job Tracking',
  description: 'Private job application tracker',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
```

Note: `Nav` is rendered by the authenticated pages' own layout in Task 10/12, not the root layout, so it never shows on `/login`. For now no page group layout exists yet.

- [ ] **Step 5: Replace `app/page.tsx` with a temporary authenticated stub**

```tsx
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <main className="p-8">Signed in as {user?.email}. Dashboard coming in a later task.</main>;
}
```

- [ ] **Step 6: Manual verification**

Prerequisite: `.env.local` filled in (Task 4), dev server running (`npm run dev`).

1. Visit `http://localhost:3000/` while logged out → redirected to `/login`.
2. Enter a wrong password → red "Invalid email or password." alert.
3. Enter correct credentials → redirected to `/`, see "Signed in as <email>".
4. Visit `/login` while logged in → redirected to `/`.

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 8: Commit**

```bash
git add app/login components/Nav.tsx app/layout.tsx app/page.tsx app/globals.css
git commit -m "feat: add login page, auth actions, and nav"
```

---

## Task 7: Applications query helpers and write actions

**Files:**
- Create: `lib/applications.ts`
- Create: `app/applications/actions.ts`

**Interfaces:**
- Consumes: `createClient` from `lib/supabase/server.ts`; `applicationSchema`, `parseApplicationForm`, `toRow`, `flattenErrors` from `lib/validation.ts`; `Application` from `lib/types.ts`
- Produces:
  - `lib/applications.ts`:
    - `getActiveApplications(): Promise<Application[]>` — `status <> 'Rejected'`, ordered `application_date desc`
    - `getRejectedApplications(): Promise<Application[]>` — `status = 'Rejected'`, ordered `rejected_at desc`
    - `getAllApplications(): Promise<Application[]>` — every row
    - `getApplication(id: string): Promise<Application | null>`
  - `app/applications/actions.ts`:
    - `type FormState = { error?: string; fieldErrors?: Record<string, string> }`
    - `createApplication(prevState: FormState, formData: FormData): Promise<FormState>` — redirects to `/applications` on success
    - `updateApplication(prevState: FormState, formData: FormData): Promise<FormState>` — reads hidden `id`; redirects to `/applications` (or `/rejected` if the resulting status is `Rejected`)
    - `deleteApplication(formData: FormData): Promise<void>` — reads `id`; revalidates and returns

- [ ] **Step 1: Write `lib/applications.ts`**

```ts
import { createClient } from './supabase/server';
import type { Application } from './types';

async function query() {
  const supabase = await createClient();
  return supabase.from('applications').select('*');
}

export async function getActiveApplications(): Promise<Application[]> {
  const { data, error } = await (await query())
    .neq('status', 'Rejected')
    .order('application_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Application[];
}

export async function getRejectedApplications(): Promise<Application[]> {
  const { data, error } = await (await query())
    .eq('status', 'Rejected')
    .order('rejected_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Application[];
}

export async function getAllApplications(): Promise<Application[]> {
  const { data, error } = await (await query());
  if (error) throw new Error(error.message);
  return (data ?? []) as Application[];
}

export async function getApplication(id: string): Promise<Application | null> {
  const { data, error } = await (await query()).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Application) ?? null;
}
```

- [ ] **Step 2: Write `app/applications/actions.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { applicationSchema, flattenErrors, parseApplicationForm, toRow } from '@/lib/validation';

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

function revalidateAll() {
  revalidatePath('/');
  revalidatePath('/applications');
  revalidatePath('/rejected');
}

export async function createApplication(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = applicationSchema.safeParse(parseApplicationForm(formData));
  if (!parsed.success) return { fieldErrors: flattenErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from('applications').insert(toRow(parsed.data));
  if (error) return { error: error.message };

  revalidateAll();
  redirect('/applications');
}

export async function updateApplication(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get('id') ?? '');
  if (!id) return { error: 'Missing application id.' };

  const parsed = applicationSchema.safeParse(parseApplicationForm(formData));
  if (!parsed.success) return { fieldErrors: flattenErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from('applications').update(toRow(parsed.data)).eq('id', id);
  if (error) return { error: error.message };

  revalidateAll();
  redirect(parsed.data.status === 'Rejected' ? '/rejected' : '/applications');
}

export async function deleteApplication(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from('applications').delete().eq('id', id);
  if (error) throw new Error(error.message);

  revalidateAll();
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/applications.ts app/applications/actions.ts
git commit -m "feat: add application query helpers and write actions"
```

---

## Task 8: Shared UI components

**Files:**
- Create: `components/StatusBadge.tsx`
- Create: `components/StatCard.tsx`
- Create: `components/DeleteButton.tsx`
- Create: `lib/format.ts`
- Test: `tests/format.test.ts`

**Interfaces:**
- Consumes: `Status` from `lib/types.ts`; `deleteApplication` from `app/applications/actions.ts`
- Produces:
  - `lib/format.ts`: `formatUSD(n: number | null): string` (`'N/A'` when null, else `'$1,234'`), `formatSalaryRange(min: number | null, max: number | null): string`, `formatPercent(rate: number): string` (`'42%'`), `formatDate(iso: string): string` (`'Jan 5, 2024'`)
  - `<StatusBadge status={Status} />`
  - `<StatCard label={string} value={string} sub?={string} />`
  - `<DeleteButton id={string} label?={string} />` (client; `window.confirm` then submits a form calling `deleteApplication`)

- [ ] **Step 1: Write the failing formatter tests**

`tests/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatDate, formatPercent, formatSalaryRange, formatUSD } from '../lib/format';

describe('formatUSD', () => {
  it('formats null as N/A', () => expect(formatUSD(null)).toBe('N/A'));
  it('formats an integer with separators', () => expect(formatUSD(1234567)).toBe('$1,234,567'));
});

describe('formatSalaryRange', () => {
  it('N/A when both null', () => expect(formatSalaryRange(null, null)).toBe('N/A'));
  it('single bound with plus/minus wording', () => {
    expect(formatSalaryRange(90000, null)).toBe('$90,000+');
    expect(formatSalaryRange(null, 90000)).toBe('Up to $90,000');
  });
  it('full range', () => expect(formatSalaryRange(80000, 120000)).toBe('$80,000 – $120,000'));
});

describe('formatPercent', () => {
  it('rounds to a whole percent', () => {
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(0.4266)).toBe('43%');
    expect(formatPercent(1)).toBe('100%');
  });
});

describe('formatDate', () => {
  it('formats an ISO date', () => expect(formatDate('2024-01-05')).toBe('Jan 5, 2024'));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL — `lib/format` not found.

- [ ] **Step 3: Write `lib/format.ts`**

```ts
const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function formatUSD(n: number | null): string {
  return n === null ? 'N/A' : usd.format(n);
}

export function formatSalaryRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return 'N/A';
  if (min !== null && max === null) return `${usd.format(min)}+`;
  if (min === null && max !== null) return `Up to ${usd.format(max)}`;
  return `${usd.format(min as number)} – ${usd.format(max as number)}`;
}

export function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Write `components/StatusBadge.tsx`**

```tsx
import type { Status } from '@/lib/types';

const styles: Record<Status, string> = {
  Applied: 'bg-blue-50 text-blue-700',
  'Online Assessment': 'bg-indigo-50 text-indigo-700',
  Interview: 'bg-amber-50 text-amber-700',
  Offer: 'bg-green-50 text-green-700',
  Rejected: 'bg-red-50 text-red-700',
  Withdrawn: 'bg-gray-100 text-gray-600',
  Ghosted: 'bg-gray-100 text-gray-500',
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}
```

- [ ] **Step 6: Write `components/StatCard.tsx`**

```tsx
export default function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}
```

- [ ] **Step 7: Write `components/DeleteButton.tsx`**

```tsx
'use client';

import { deleteApplication } from '@/app/applications/actions';

export default function DeleteButton({ id, label = 'Delete' }: { id: string; label?: string }) {
  return (
    <form
      action={deleteApplication}
      onSubmit={(e) => {
        if (!window.confirm('Delete this application? This cannot be undone.')) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-sm text-red-600 hover:text-red-800">
        {label}
      </button>
    </form>
  );
}
```

- [ ] **Step 8: Type-check and commit**

Run: `npx tsc --noEmit` (expect no errors)

```bash
git add lib/format.ts tests/format.test.ts components/StatusBadge.tsx components/StatCard.tsx components/DeleteButton.tsx
git commit -m "feat: add formatters and shared UI components"
```

---

## Task 9: ApplicationForm and ApplicationsTable

**Files:**
- Create: `components/ApplicationForm.tsx`
- Create: `components/ApplicationsTable.tsx`

**Interfaces:**
- Consumes: `FormState`, `createApplication`, `updateApplication` from `app/applications/actions.ts`; `STATUS_VALUES`, `Application` from `lib/types.ts`; `Application` fields; `StatusBadge`, `DeleteButton`; `formatSalaryRange`, `formatDate` from `lib/format.ts`
- Produces:
  - `<ApplicationForm mode="create" />` and `<ApplicationForm mode="edit" application={Application} />` — client component using `useActionState`
  - `<ApplicationsTable applications={Application[]} emptyMessage={string} />` — server component; each row links to `/applications/[id]/edit` and includes `<DeleteButton />`

- [ ] **Step 1: Write `components/ApplicationForm.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import {
  createApplication,
  updateApplication,
  type FormState,
} from '@/app/applications/actions';
import { STATUS_VALUES, type Application } from '@/lib/types';

const initial: FormState = {};

type Props = { mode: 'create'; application?: undefined } | { mode: 'edit'; application: Application };

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ApplicationForm(props: Props) {
  const isEdit = props.mode === 'edit';
  const action = isEdit ? updateApplication : createApplication;
  const [state, formAction, pending] = useActionState(action, initial);
  const a = props.application;
  const err = state.fieldErrors ?? {};

  const field = 'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600';
  const errText = 'mt-1 text-sm text-red-600';

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      {isEdit && <input type="hidden" name="id" defaultValue={a!.id} />}

      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
          Business name
        </label>
        <input id="company_name" name="company_name" defaultValue={a?.company_name ?? ''} required className={field} />
        {err.company_name && <p className={errText}>{err.company_name}</p>}
      </div>

      <div>
        <label htmlFor="job_title" className="block text-sm font-medium text-gray-700">
          Job title
        </label>
        <input id="job_title" name="job_title" defaultValue={a?.job_title ?? ''} required className={field} />
        {err.job_title && <p className={errText}>{err.job_title}</p>}
      </div>

      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700">
          Location <span className="text-gray-400">(leave blank for N/A)</span>
        </label>
        <input id="location" name="location" defaultValue={a?.location ?? ''} className={field} />
        {err.location && <p className={errText}>{err.location}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="salary_min" className="block text-sm font-medium text-gray-700">
            Salary min (USD)
          </label>
          <input
            id="salary_min"
            name="salary_min"
            type="number"
            min="0"
            step="1"
            defaultValue={a?.salary_min ?? ''}
            className={field}
          />
          {err.salary_min && <p className={errText}>{err.salary_min}</p>}
        </div>
        <div>
          <label htmlFor="salary_max" className="block text-sm font-medium text-gray-700">
            Salary max (USD)
          </label>
          <input
            id="salary_max"
            name="salary_max"
            type="number"
            min="0"
            step="1"
            defaultValue={a?.salary_max ?? ''}
            className={field}
          />
          {err.salary_max && <p className={errText}>{err.salary_max}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="application_date" className="block text-sm font-medium text-gray-700">
          Application date
        </label>
        <input
          id="application_date"
          name="application_date"
          type="date"
          defaultValue={a?.application_date ?? todayISO()}
          required
          className={field}
        />
        {err.application_date && <p className={errText}>{err.application_date}</p>}
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
          Status
        </label>
        <select id="status" name="status" defaultValue={a?.status ?? 'Applied'} className={field}>
          {STATUS_VALUES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {err.status && <p className={errText}>{err.status}</p>}
      </div>

      <div>
        <label htmlFor="dashboard_url" className="block text-sm font-medium text-gray-700">
          Application dashboard link <span className="text-gray-400">(leave blank for N/A)</span>
        </label>
        <input id="dashboard_url" name="dashboard_url" type="url" defaultValue={a?.dashboard_url ?? ''} className={field} />
        {err.dashboard_url && <p className={errText}>{err.dashboard_url}</p>}
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea id="notes" name="notes" rows={3} defaultValue={a?.notes ?? ''} className={field} />
        {err.notes && <p className={errText}>{err.notes}</p>}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Add application'}
        </button>
        <Link href="/applications" className="text-sm text-gray-500 hover:text-gray-900">
          Cancel
        </Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Write `components/ApplicationsTable.tsx`**

```tsx
import Link from 'next/link';
import DeleteButton from './DeleteButton';
import StatusBadge from './StatusBadge';
import { formatDate, formatSalaryRange } from '@/lib/format';
import type { Application } from '@/lib/types';

export default function ApplicationsTable({
  applications,
  emptyMessage,
}: {
  applications: Application[];
  emptyMessage: string;
}) {
  if (applications.length === 0) {
    return <p className="rounded-md border border-dashed border-gray-300 p-6 text-center text-gray-500">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-2">Business</th>
            <th className="px-4 py-2">Title</th>
            <th className="px-4 py-2">Location</th>
            <th className="px-4 py-2">Salary</th>
            <th className="px-4 py-2">Applied</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Link</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {applications.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-2 font-medium text-gray-900">{a.company_name}</td>
              <td className="px-4 py-2 text-gray-700">{a.job_title}</td>
              <td className="px-4 py-2 text-gray-700">{a.location ?? 'N/A'}</td>
              <td className="px-4 py-2 text-gray-700">{formatSalaryRange(a.salary_min, a.salary_max)}</td>
              <td className="px-4 py-2 text-gray-700">{formatDate(a.application_date)}</td>
              <td className="px-4 py-2">
                <StatusBadge status={a.status} />
              </td>
              <td className="px-4 py-2">
                {a.dashboard_url ? (
                  <a href={a.dashboard_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    Open
                  </a>
                ) : (
                  'N/A'
                )}
              </td>
              <td className="px-4 py-2">
                <div className="flex gap-3">
                  <Link href={`/applications/${a.id}/edit`} className="text-blue-600 hover:underline">
                    Edit
                  </Link>
                  <DeleteButton id={a.id} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Type-check and commit**

Run: `npx tsc --noEmit` (expect no errors)

```bash
git add components/ApplicationForm.tsx components/ApplicationsTable.tsx
git commit -m "feat: add application form and table components"
```

---

## Task 10: Applications pages (list, new, edit) + authenticated layout

**Files:**
- Create: `app/(app)/layout.tsx` — authenticated shell rendering `<Nav />`
- Move: `app/page.tsx` → `app/(app)/page.tsx` (dashboard stub from Task 6)
- Create: `app/(app)/applications/page.tsx`
- Create: `app/(app)/applications/new/page.tsx`
- Create: `app/(app)/applications/[id]/edit/page.tsx`
- Move: `app/applications/actions.ts` → `app/(app)/applications/actions.ts` and update the import path in `components/DeleteButton.tsx`, `components/ApplicationForm.tsx` (from `@/app/applications/actions` to `@/app/(app)/applications/actions`)
- Keep: `app/login/` outside the group (no Nav)

**Interfaces:**
- Consumes: `getActiveApplications`, `getApplication` from `lib/applications.ts`; `ApplicationsTable`, `ApplicationForm`, `Nav`
- Produces: routes `/applications`, `/applications/new`, `/applications/[id]/edit`, and the `(app)` route group layout

Note on route groups: `(app)` is not part of the URL. `app/(app)/page.tsx` still serves `/`. This keeps `/login` free of the Nav while every other page gets it.

- [ ] **Step 1: Create `app/(app)/layout.tsx`**

```tsx
import Nav from '@/components/Nav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </>
  );
}
```

- [ ] **Step 2: Move dashboard stub and actions into the group**

- Move `app/page.tsx` to `app/(app)/page.tsx` (content unchanged from Task 6 stub).
- Move `app/applications/actions.ts` to `app/(app)/applications/actions.ts`.
- In `components/DeleteButton.tsx` and `components/ApplicationForm.tsx`, change `@/app/applications/actions` to `@/app/(app)/applications/actions`.

- [ ] **Step 3: Create `app/(app)/applications/page.tsx`**

```tsx
import Link from 'next/link';
import ApplicationsTable from '@/components/ApplicationsTable';
import { getActiveApplications } from '@/lib/applications';

export const dynamic = 'force-dynamic';

export default async function ApplicationsPage() {
  const applications = await getActiveApplications();

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Applications</h1>
        <Link
          href="/applications/new"
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add application
        </Link>
      </div>
      <ApplicationsTable
        applications={applications}
        emptyMessage="No active applications yet. Add your first one."
      />
    </section>
  );
}
```

- [ ] **Step 4: Create `app/(app)/applications/new/page.tsx`**

```tsx
import ApplicationForm from '@/components/ApplicationForm';

export default function NewApplicationPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Add application</h1>
      <ApplicationForm mode="create" />
    </section>
  );
}
```

- [ ] **Step 5: Create `app/(app)/applications/[id]/edit/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import ApplicationForm from '@/components/ApplicationForm';
import { getApplication } from '@/lib/applications';

export default async function EditApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const application = await getApplication(id);
  if (!application) notFound();

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Edit application</h1>
      <ApplicationForm mode="edit" application={application} />
    </section>
  );
}
```

- [ ] **Step 6: Manual verification**

Dev server running, logged in:

1. `/applications` → empty state message.
2. Click "Add application" → fill form → submit → back on `/applications`, row visible.
3. Submit the form with a blank business name → inline "Company name is required" under the field, no redirect.
4. Submit with min salary 100000, max 80000 → inline error under max salary.
5. Edit the row, change status to `Interview`, save → row shows Interview badge.
6. Edit the row, change status to `Rejected`, save → redirected to `/rejected`, row no longer on `/applications`.
7. Delete a row → confirm dialog → row disappears.

- [ ] **Step 7: Build and commit**

Run: `npm run build` (expect success)

```bash
git add app components/DeleteButton.tsx components/ApplicationForm.tsx
git commit -m "feat: add applications pages and authenticated layout"
```

---

## Task 11: Rejected page

**Files:**
- Create: `app/(app)/rejected/page.tsx`
- Create: `components/RejectedTable.tsx`

**Interfaces:**
- Consumes: `getRejectedApplications` from `lib/applications.ts`; `formatDate`, `formatSalaryRange`; `DeleteButton`; `updateApplication` is NOT used here — un-reject is a link to the edit page
- Produces: route `/rejected`; `<RejectedTable applications={Application[]} />`

Design decision: "un-reject" reuses the existing edit page (change status, save). The Rejected table shows the rejection date and a link to edit. No separate un-reject action needed — YAGNI.

- [ ] **Step 1: Create `components/RejectedTable.tsx`**

```tsx
import Link from 'next/link';
import DeleteButton from './DeleteButton';
import { formatDate, formatSalaryRange } from '@/lib/format';
import type { Application } from '@/lib/types';

export default function RejectedTable({ applications }: { applications: Application[] }) {
  if (applications.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-gray-300 p-6 text-center text-gray-500">
        No rejected applications. Keep going.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-2">Business</th>
            <th className="px-4 py-2">Title</th>
            <th className="px-4 py-2">Location</th>
            <th className="px-4 py-2">Salary</th>
            <th className="px-4 py-2">Applied</th>
            <th className="px-4 py-2">Rejected</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {applications.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-2 font-medium text-gray-900">{a.company_name}</td>
              <td className="px-4 py-2 text-gray-700">{a.job_title}</td>
              <td className="px-4 py-2 text-gray-700">{a.location ?? 'N/A'}</td>
              <td className="px-4 py-2 text-gray-700">{formatSalaryRange(a.salary_min, a.salary_max)}</td>
              <td className="px-4 py-2 text-gray-700">{formatDate(a.application_date)}</td>
              <td className="px-4 py-2 text-gray-700">
                {a.rejected_at ? formatDate(a.rejected_at.slice(0, 10)) : '—'}
              </td>
              <td className="px-4 py-2">
                <div className="flex gap-3">
                  <Link href={`/applications/${a.id}/edit`} className="text-blue-600 hover:underline">
                    Edit / un-reject
                  </Link>
                  <DeleteButton id={a.id} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/(app)/rejected/page.tsx`**

```tsx
import RejectedTable from '@/components/RejectedTable';
import { getRejectedApplications } from '@/lib/applications';

export const dynamic = 'force-dynamic';

export default async function RejectedPage() {
  const applications = await getRejectedApplications();

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Rejected</h1>
      <p className="text-sm text-gray-500">
        {applications.length} rejected application{applications.length === 1 ? '' : 's'}.
      </p>
      <RejectedTable applications={applications} />
    </section>
  );
}
```

- [ ] **Step 3: Manual verification**

1. With at least one Rejected application, visit `/rejected` → it appears with a rejection date.
2. Click "Edit / un-reject", change status to `Applied`, save → redirected to `/applications`, row back in the active list, gone from `/rejected`.

- [ ] **Step 4: Build and commit**

Run: `npm run build` (expect success)

```bash
git add app/(app)/rejected components/RejectedTable.tsx
git commit -m "feat: add rejected applications page"
```

---

## Task 12: Dashboard with stats and charts

**Files:**
- Create: `components/AppsOverTimeChart.tsx`
- Create: `components/StatusBreakdownChart.tsx`
- Overwrite: `app/(app)/page.tsx` (replace the stub)

**Interfaces:**
- Consumes: `getAllApplications`; `computeStats`, `DashboardStats`, `MonthCount`, `StatusCount`; `StatCard`; `formatUSD`, `formatPercent`
- Produces: `<AppsOverTimeChart data={MonthCount[]} />`, `<StatusBreakdownChart data={StatusCount[]} />` (both client components), the finished dashboard at `/`

- [ ] **Step 1: Create `components/AppsOverTimeChart.tsx`**

```tsx
'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MonthCount } from '@/lib/stats';

export default function AppsOverTimeChart({ data }: { data: MonthCount[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-400">No applications yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" fontSize={12} />
        <YAxis allowDecimals={false} fontSize={12} />
        <Tooltip />
        <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Create `components/StatusBreakdownChart.tsx`**

```tsx
'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { StatusCount } from '@/lib/stats';

export default function StatusBreakdownChart({ data }: { data: StatusCount[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="status" fontSize={11} interval={0} angle={-20} textAnchor="end" height={60} />
        <YAxis allowDecimals={false} fontSize={12} />
        <Tooltip />
        <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: Overwrite `app/(app)/page.tsx`**

```tsx
import AppsOverTimeChart from '@/components/AppsOverTimeChart';
import StatCard from '@/components/StatCard';
import StatusBreakdownChart from '@/components/StatusBreakdownChart';
import { getAllApplications } from '@/lib/applications';
import { formatPercent, formatUSD } from '@/lib/format';
import { computeStats } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const applications = await getAllApplications();
  const stats = computeStats(applications);

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
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
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-medium text-gray-700">Applications over time</h2>
          <AppsOverTimeChart data={stats.overTime} />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-medium text-gray-700">Status breakdown</h2>
          <StatusBreakdownChart data={stats.statusBreakdown} />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Manual verification**

1. `/` with a few applications of mixed statuses and one with both salary bounds → stat cards show correct numbers, avg salary matches the midpoint, both charts render.
2. With zero applications → cards all show 0 / N/A, "Applications over time" shows "No applications yet.", status chart shows all-zero bars.

- [ ] **Step 5: Build and commit**

Run: `npm run build` (expect success)

```bash
git add app/(app)/page.tsx components/AppsOverTimeChart.tsx components/StatusBreakdownChart.tsx
git commit -m "feat: add dashboard with stats and charts"
```

---

## Task 13: Error boundary, 404, and polish

**Files:**
- Create: `app/error.tsx`
- Create: `app/not-found.tsx`
- Modify: `app/(app)/applications/page.tsx` and `app/(app)/rejected/page.tsx` — wrap the data fetch in try/catch, render a red banner on failure

**Interfaces:**
- Consumes: nothing new
- Produces: `app/error.tsx` (client component, `reset` button), `app/not-found.tsx`

- [ ] **Step 1: Create `app/error.tsx`**

```tsx
'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-lg font-semibold text-gray-900">Something went wrong</h1>
      <p className="mt-2 text-sm text-gray-500">The page failed to load.</p>
      <button
        onClick={reset}
        className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Try again
      </button>
    </main>
  );
}
```

- [ ] **Step 2: Create `app/not-found.tsx`**

```tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-lg font-semibold text-gray-900">Page not found</h1>
      <Link href="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
        Back to dashboard
      </Link>
    </main>
  );
}
```

- [ ] **Step 3: Add error banners to the list pages**

In `app/(app)/applications/page.tsx`, replace the body with:

```tsx
import Link from 'next/link';
import ApplicationsTable from '@/components/ApplicationsTable';
import { getActiveApplications } from '@/lib/applications';
import type { Application } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ApplicationsPage() {
  let applications: Application[] = [];
  let loadError: string | null = null;
  try {
    applications = await getActiveApplications();
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'Failed to load applications.';
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Applications</h1>
        <Link
          href="/applications/new"
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add application
        </Link>
      </div>
      {loadError ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      ) : (
        <ApplicationsTable
          applications={applications}
          emptyMessage="No active applications yet. Add your first one."
        />
      )}
    </section>
  );
}
```

Apply the same try/catch + banner pattern to `app/(app)/rejected/page.tsx` (wrap `getRejectedApplications`, render the banner instead of `<RejectedTable>` on error).

- [ ] **Step 4: Build and commit**

Run: `npm run build` (expect success)

```bash
git add app/error.tsx app/not-found.tsx app/(app)/applications/page.tsx app/(app)/rejected/page.tsx
git commit -m "feat: add error boundary, 404, and load-error banners"
```

---

## Task 14: End-to-end test, README, and deployment docs

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/app.spec.ts`
- Create: `e2e/.env.example`
- Overwrite: `README.md` (full version)
- Modify: `.gitignore` — add `.env*.local`, `/test-results`, `/playwright-report`

**Interfaces:**
- Consumes: a running app + a Supabase project with the migration applied and a test user
- Produces: one Playwright spec covering the core flow; complete setup + deploy docs

- [ ] **Step 1: Create `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/login',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

- [ ] **Step 2: Create `e2e/.env.example`**

```bash
# Credentials for the Playwright E2E test user (must exist in your Supabase project).
E2E_EMAIL=you@example.com
E2E_PASSWORD=your-test-password
```

- [ ] **Step 3: Write `e2e/app.spec.ts`**

```ts
import { expect, test } from '@playwright/test';

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run this test');

test('log in, add an application, reject it, see it move to the Rejected page', async ({ page }) => {
  const company = `E2E Co ${Date.now()}`;

  await page.goto('/login');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL('/');

  await page.goto('/applications/new');
  await page.getByLabel('Business name').fill(company);
  await page.getByLabel('Job title').fill('Playwright Engineer');
  await page.getByLabel('Salary min (USD)').fill('80000');
  await page.getByLabel('Salary max (USD)').fill('120000');
  await page.getByRole('button', { name: 'Add application' }).click();

  await expect(page).toHaveURL('/applications');
  await expect(page.getByRole('cell', { name: company })).toBeVisible();

  await page.getByRole('row', { name: new RegExp(company) }).getByRole('link', { name: 'Edit' }).click();
  await page.getByLabel('Status').selectOption('Rejected');
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect(page).toHaveURL('/rejected');
  await expect(page.getByRole('cell', { name: company })).toBeVisible();

  await page.goto('/applications');
  await expect(page.getByRole('cell', { name: company })).toHaveCount(0);

  // cleanup
  await page.goto('/rejected');
  page.on('dialog', (d) => d.accept());
  await page.getByRole('row', { name: new RegExp(company) }).getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('cell', { name: company })).toHaveCount(0);
});
```

- [ ] **Step 4: Run the E2E test**

Prerequisite: `.env.local` set, and `E2E_EMAIL`/`E2E_PASSWORD` exported (or in `.env.local`, which `next dev` loads — Playwright reads them from the app's environment, so also set them in your shell for the `test.skip` guard, or add `import 'dotenv/config'` — simplest: export them in the shell before running).

Run: `npm run e2e`
Expected: 1 passed. If credentials are unset, the test is skipped (still green).

- [ ] **Step 5: Overwrite `README.md`**

```markdown
# Job Tracking

Private, single-user job application tracker. Record applications, track status,
view aggregate stats. Applications set to **Rejected** move automatically to a
dedicated Rejected page.

## Stack

Next.js (App Router) · Supabase (Postgres + Auth) · Tailwind CSS · Recharts ·
Vitest · Playwright · deployed on Vercel.

## Local setup

1. **Supabase project** — create one at https://supabase.com.
2. **Migration** — apply `supabase/migrations/0001_applications.sql`:
   - CLI: `npx supabase link --project-ref <ref>` then `npx supabase db push`
   - or paste it into the SQL Editor and run.
3. **User** — Authentication → Users → Add user. Create your single account
   (email + password). There is no sign-up page by design.
4. **Env** — copy `.env.local.example` to `.env.local` and fill in
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
   Project Settings → API.
5. **Install & run**:

   ```bash
   npm install
   npm run dev
   ```

   Open http://localhost:3000 and sign in.

## Tests

- `npm test` — unit tests (validation, stats, formatters).
- `npm run e2e` — one end-to-end flow. Set `E2E_EMAIL` and `E2E_PASSWORD`
  (a real user in your Supabase project) in your shell first, or the test skips.

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, import the repo (framework auto-detected as Next.js).
3. Add environment variables `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same values as `.env.local`).
4. Deploy. In Supabase → Authentication → URL Configuration, add your Vercel
   domain to the allowed redirect/site URLs.

## Notes

- Only the current status of each application is stored, not history. An
  application that interviewed and was then rejected counts as a rejection, not
  an interview.
- Salary is USD integers only. "Avg salary" is the mean midpoint of applications
  that have both a min and a max.
```

- [ ] **Step 6: Update `.gitignore`**

Ensure these lines are present:

```
.env*.local
/test-results
/playwright-report
```

- [ ] **Step 7: Full verification**

Run, expecting all green:

```bash
npm test
npm run build
npm run e2e
```

- [ ] **Step 8: Commit**

```bash
git add playwright.config.ts e2e README.md .gitignore
git commit -m "test: add E2E flow; docs: full README and deploy guide"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task(s) |
|---|---|
| Single user, email/password, no sign-up | 4 (create user), 5 (middleware guard), 6 (login) |
| RLS, own-rows only | 4 |
| Tech stack (Next, Supabase, Tailwind, Recharts, Vitest, Playwright) | 1 |
| `applications` table + columns + constraints | 4 |
| Status values + closed set | 2 (`STATUS_VALUES`, `CLOSED_STATUSES`), 4 (check constraint) |
| `updated_at` + `rejected_at` triggers | 4 |
| Routes `/login /  /applications /applications/new /applications/[id]/edit /rejected` | 6, 10, 11, 12 |
| Middleware redirect for unauthenticated | 5 |
| `/applications` excludes Rejected; `/rejected` only Rejected, by `rejected_at desc` | 7 (`getActiveApplications`, `getRejectedApplications`) |
| Status→Rejected moves the row between pages | 7 (`updateApplication` redirect), 10/11 (verification) |
| Stats: total, open, interviews+rate, offers+rate, rejections+rate, avg salary, over-time, status breakdown | 3 (`computeStats`), 12 (render) |
| Known limitation (no history) documented | spec + README (14) |
| Components: StatCard, StatusBadge, ApplicationForm, ApplicationsTable, DeleteButton, both charts | 8, 9, 12 |
| Mutations as server actions + `revalidatePath` | 7 |
| zod validation rules (required, date not future, salary order, http(s) URL) | 2 |
| Error handling: inline field errors, red banner, empty states, `not-found`/`error` | 6, 9, 10, 11, 13 |
| Testing: stats unit, schema unit, one E2E | 2, 3, 8, 14 |
| Deployment: Vercel, env vars, README setup steps | 4, 14 |
| Visual style: light, blue accent, cards | 6, 8, 12 (Tailwind classes throughout) |
| Out of scope items not built | — (no tasks for history, multi-currency, multi-user, import, notifications, attachments) |

No gaps found.

**Placeholder scan:** No "TBD"/"TODO"/"add error handling" placeholders. Every code step contains complete code. Manual-verification steps list concrete actions and expected results.

**Type consistency:**
- `Application` shape defined in Task 2, used identically in Tasks 3, 7, 9, 11, 12.
- `Status` / `STATUS_VALUES` / `CLOSED_STATUSES` from Task 2 used in Tasks 3, 8, 9.
- `FormState` defined in Task 7, consumed by Task 9 (`ApplicationForm`). `AuthState` defined in Task 6, consumed by the login page in the same task.
- `computeStats` return type `DashboardStats` (Task 3) with `MonthCount`/`StatusCount` consumed by chart components in Task 12 — names match (`overTime`, `statusBreakdown`, `interviews.count`, `interviews.rate`, `avgSalary`).
- `createClient` (server) is async everywhere it is used (Tasks 5, 6, 7).
- Task 10 moves `app/applications/actions.ts` into `app/(app)/applications/actions.ts` and updates the two import sites — noted explicitly so Tasks 8/9's `@/app/applications/actions` imports are corrected.

One cross-task note applied: Tasks 8 and 9 initially import from `@/app/applications/actions`; Task 10 Step 2 changes these to `@/app/(app)/applications/actions` when the route group is introduced. Executor must apply that step.
