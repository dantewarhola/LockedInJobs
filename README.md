# LockedInJobs

Multi-user job application tracker. Anyone can sign up; each account sees only its
own applications (enforced by Postgres row-level security). Record applications,
track status, view aggregate stats. Applications set to **Rejected** move
automatically to a dedicated Rejected page.

## Stack

Next.js 16 (App Router) · Supabase (Postgres + Auth) · Tailwind CSS 4 · Recharts ·
Vitest · Playwright · deployed on Vercel.

## Local setup

1. **Supabase project** — create one at https://supabase.com.
2. **Migrations** — apply every file in `supabase/migrations/` in order
   (`0001_applications.sql`, `0002_status_na.sql`, `0003_files_storage.sql`).
   `0003` creates the private `application-files` storage bucket and its
   per-user access policies:
   - CLI: `npx supabase link --project-ref <ref>` then `npx supabase db push`
   - or paste each file into the Supabase SQL Editor and run.
3. **Auth configuration** (Authentication section of the dashboard):
   - **Providers → Email**: keep "Confirm email" ON.
   - **URL Configuration**: set Site URL to your app origin and add these to
     "Redirect URLs": `http://localhost:3000/**` and
     `https://<your-vercel-domain>/**`.
   - **Email Templates** — change the link in two templates so it points at this
     app's confirm route instead of Supabase's default:
     - *Confirm signup*:
       `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard">Confirm your email</a>`
     - *Reset password*:
       `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/update-password">Reset your password</a>`
4. **Env** — copy `.env.local.example` to `.env.local` and fill in
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
   Project Settings → API.
5. **Install & run**:

   ```bash
   npm install
   npm run dev
   ```

   Open http://localhost:3000, create an account, confirm via the email link,
   then sign in.

## Accounts

- `/signup` — open registration, email + password. A confirmation email must be
  clicked before the first sign-in.
- `/forgot-password` — sends a reset link; it lands on `/update-password`.
- Data is isolated per account by row-level security; `user_id` defaults to the
  authenticated user on insert, and every policy checks `auth.uid() = user_id`.

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

## Theme

Light / Dark / System toggle in the nav and on the auth pages. The choice is
stored in `localStorage` and applied before first paint (no flash); "System"
follows `prefers-color-scheme` and updates live when the OS setting changes.

## Files

`/files` — upload and download **PDF-only** documents (resume, cover letters,
certifications, letters of recommendation), up to 15 MB each. Files live in a
private Supabase Storage bucket under a folder named with your user id; storage
policies plus the bucket's `allowed_mime_types`/`file_size_limit` enforce
PDF-only and per-user isolation. Downloads use short-lived signed URLs. No public
or shared links.

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
