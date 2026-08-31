# Job Tracking

Private, single-user job application tracker. Record applications, track status,
view aggregate stats. Applications set to **Rejected** move automatically to a
dedicated Rejected page.

## Stack

Next.js 16 (App Router) · Supabase (Postgres + Auth) · Tailwind CSS 4 · Recharts ·
Vitest · Playwright · deployed on Vercel.

## Local setup

1. **Supabase project** — create one at https://supabase.com.
2. **Migrations** — apply every file in `supabase/migrations/` in order
   (`0001_applications.sql`, then `0002_status_na.sql`):
   - CLI: `npx supabase link --project-ref <ref>` then `npx supabase db push`
   - or paste each file into the Supabase SQL Editor and run.
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
   domain to the Site URL / redirect allow list.

## Importing from Excel

`/applications` → **Import from Excel**. Upload a `.xlsx` with columns
`Business, Job Title, Location, Salary, Application Date, Status, Link`.
Salary may be a range (`$80,000 - $120,000`), a single number, or `N/A`.
A blank or `N/A` Status is imported as the `N/A` status. You get a preview
with invalid rows flagged before anything is written; only valid rows are
imported.

## Application flow (Sankey)

The dashboard has an "Application flow" Sankey widget:

```
Total ─┬─> Applied ─┬─> OA ──> Interview ──> Offer
       │            ├─> Withdrawn
       │            └─> Ghosted
       ├─> Rejected
       ├─> Awaiting response   (still at "Applied")
       └─> No status           (status "N/A")
```

Because only the current status of each application is stored (not its history),
the forward stages are **inferred** — anyone currently at "Interview" is counted
as having passed through "OA", etc. Every application is represented exactly once,
so the Total node equals the real application count.

## Notes

- Status `N/A` means the application did not state one.
- Only the current status of each application is stored, not history. An
  application that interviewed and was then rejected counts as a rejection, not
  an interview.
- Salary is USD integers only. "Avg salary" is the mean midpoint of applications
  that have both a min and a max.
- Design spec: `docs/superpowers/specs/2026-08-31-job-tracking-design.md`
