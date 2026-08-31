# Job Tracking Website — Design Spec

Date: 2026-08-31
Status: Approved for planning

## Purpose

A private, single-user web app for tracking job applications. The owner records
each application, updates its status over time, and views aggregate stats about
their search. When an application's status becomes "Rejected" it disappears from
the active list and appears on a dedicated Rejected page.

## Users & Access

- Single user: the site owner.
- Email + password login via Supabase Auth.
- No public sign-up. The owner creates their one user account manually in the
  Supabase dashboard.
- All data is private. Row Level Security ensures only the authenticated owner
  can read or write any row.

## Tech Stack

- Next.js (App Router) + TypeScript
- Supabase: Postgres database + Auth
- `@supabase/ssr` for cookie-based auth in server components and middleware
- Tailwind CSS
- Recharts for charts
- Vitest for unit tests, Playwright for one end-to-end test
- Hosting: Vercel
- Database migrations tracked in `supabase/migrations/`

## Data Model

Single table: `applications`.

| Column | Type | Constraints / Notes |
|---|---|---|
| `id` | uuid | primary key, default `gen_random_uuid()` |
| `user_id` | uuid | not null, default `auth.uid()`, references `auth.users(id)` |
| `company_name` | text | not null |
| `job_title` | text | not null |
| `location` | text | nullable (null = N/A) |
| `salary_min` | integer | nullable |
| `salary_max` | integer | nullable |
| `application_date` | date | not null, default `current_date` |
| `status` | text | not null, default `'Applied'`, `CHECK` in allowed list |
| `dashboard_url` | text | nullable (null = N/A) |
| `notes` | text | nullable |
| `rejected_at` | timestamptz | nullable, managed by trigger |
| `created_at` | timestamptz | not null, default `now()` |
| `updated_at` | timestamptz | not null, default `now()`, maintained by trigger |

### Allowed status values

`Applied`, `Online Assessment`, `Interview`, `Offer`, `Rejected`, `Withdrawn`,
`Ghosted`

Enforced with a `CHECK` constraint (text + check, not a Postgres enum, so the
list is easy to amend later).

### Triggers

1. `set_updated_at` — sets `updated_at = now()` on every `UPDATE`.
2. `manage_rejected_at` — on insert/update: if `status = 'Rejected'` and
   `rejected_at IS NULL`, set `rejected_at = now()`; if `status <> 'Rejected'`,
   set `rejected_at = NULL`.

### Row Level Security

- RLS enabled on `applications`.
- One policy per command (select/insert/update/delete), each with
  `USING (auth.uid() = user_id)` and, where applicable,
  `WITH CHECK (auth.uid() = user_id)`.

## Pages & Routes

| Route | Purpose | Access |
|---|---|---|
| `/login` | Email + password sign-in | Public |
| `/` | Dashboard: stat cards + 2 charts | Protected |
| `/applications` | Table of non-rejected applications; add / edit / delete | Protected |
| `/applications/new` | Create form | Protected |
| `/applications/[id]/edit` | Edit form | Protected |
| `/rejected` | Table of rejected applications; un-reject or delete | Protected |

- Middleware refreshes the Supabase session and redirects unauthenticated
  requests for protected routes to `/login`.
- `/applications` query filters `status <> 'Rejected'`.
- `/rejected` query filters `status = 'Rejected'`, ordered by `rejected_at desc`.
- Changing an application's status to `Rejected` (from any form) moves it between
  the two lists automatically — it is the same row, filtered by status. Setting
  status away from `Rejected` on the Rejected page moves it back.

## Stats Logic

The dashboard is a server component. It fetches all of the user's rows once and
passes them to pure functions in `lib/stats.ts`. No SQL aggregation; data volume
is small (single user).

| Stat | Definition |
|---|---|
| Total applications | row count |
| Open positions | count where `status NOT IN ('Rejected','Withdrawn','Ghosted')` |
| Interviews | count where `status IN ('Interview','Offer')`; rate = count / total |
| Offers | count where `status = 'Offer'`; rate = count / total |
| Rejections | count where `status = 'Rejected'`; rate = count / total |
| Avg salary | mean of `(salary_min + salary_max) / 2` across rows where both are non-null; `null` when no such rows |
| Applications over time | rows grouped by `application_date` truncated to month |
| Status breakdown | count per status value |

### Known limitation

Only the current status is stored, not status history. An application that
reached the interview stage and was then rejected counts toward Rejections, not
Interviews. Acceptable for v1.

## Components

| Component | Responsibility |
|---|---|
| `StatCard` | One labelled metric, optional secondary line (e.g. rate %) |
| `StatusBadge` | Coloured pill for a status value |
| `ApplicationForm` | Create/edit form; client component; zod validation |
| `ApplicationsTable` | Renders a list of applications with row actions |
| `DeleteButton` | Delete with an explicit confirm step |
| `AppsOverTimeChart` | Recharts line/bar of applications per month |
| `StatusBreakdownChart` | Recharts bar/pie of count per status |

Data mutations (create / update / delete) are implemented as Next.js server
actions that call Supabase, then `revalidatePath`.

## Validation Rules

Enforced by a shared zod schema used on both client and server action:

- `company_name`, `job_title` — required, non-empty, trimmed
- `application_date` — required, valid date, not in the future
- `status` — must be one of the allowed values
- `salary_min`, `salary_max` — optional; if present, non-negative integers
- if both salaries present, `salary_max >= salary_min`
- `dashboard_url` — optional; if present, must parse as a valid `http(s)` URL
- `location`, `notes` — optional free text

## Error Handling

- Form: inline field-level errors from zod; submit disabled while pending.
- Server action / Supabase failures: returned to the page and shown as a red
  banner above the form or table.
- Every table and the dashboard render an explicit empty state.
- `app/not-found.tsx` and `app/error.tsx` provided.

## Testing

- **Vitest** — `lib/stats.ts`: total, open, rates, average salary (including the
  no-salary-data case), month grouping, status breakdown.
- **Vitest** — zod schema: salary ordering, future date rejection, URL
  validation, required fields.
- **Playwright** — one end-to-end flow: log in → create an application → edit it
  to `Rejected` → assert it is gone from `/applications` and present on
  `/rejected`.

## Deployment

- Repository deployed on Vercel.
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `README.md` documents: create Supabase project, run the migration (via Supabase
  CLI or SQL editor), create the single auth user, set env vars locally and on
  Vercel, run dev server, deploy.

## Visual Style

Clean light dashboard: white / light-gray surfaces, a single blue accent,
card-based stat layout, readable sans-serif type. Standard admin aesthetic.

## Out of Scope (v1)

- Status history / audit trail
- Multiple currencies
- Multi-user support or sharing
- Importing applications from files or email
- Notifications / reminders
- Attachments (resume, cover letter files)
