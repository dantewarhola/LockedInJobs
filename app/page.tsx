import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const features = [
  {
    title: 'Track every application',
    body: 'Log companies, roles, salary ranges and dates in one place. Update the status as you move through each pipeline.',
  },
  {
    title: 'See your funnel',
    body: 'A dashboard of stat cards and charts shows totals, interview and offer rates, average salary and applications over time.',
  },
  {
    title: 'Visualise the flow',
    body: 'A Sankey diagram maps how applications progress from applied to interview, offer, rejection or no response.',
  },
  {
    title: 'Keep rejections separate',
    body: 'Closed-out applications move to their own page so your active list stays focused on what is still live.',
  },
  {
    title: 'Store your documents',
    body: 'Upload resumes and cover letters as PDFs, kept private to your account and downloadable whenever you need them.',
  },
  {
    title: 'Import in bulk',
    body: 'Paste or upload existing application data and review a preview before it is added to your tracker.',
  },
];

export default async function LandingPage() {
  let signedIn = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = !!user;
  } catch {
    // Supabase not configured — treat as signed out.
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <nav className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <span className="font-semibold text-gray-900 dark:text-gray-100">LockedInJobs</span>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {signedIn ? (
              <Link
                href="/dashboard"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Open dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Log in
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        <section className="py-16 sm:py-24">
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl dark:text-gray-100">
            Your private job search, organised.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
            Track applications, watch your interview and offer rates, and keep every resume and cover
            letter in one place. Your data stays private to your account.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={signedIn ? '/dashboard' : '/signup'}
              className="rounded-md bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
            >
              {signedIn ? 'Open dashboard' : 'Get started'}
            </Link>
            {!signedIn && (
              <Link
                href="/login"
                className="rounded-md border border-gray-300 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Log in
              </Link>
            )}
          </div>
        </section>

        <section className="grid gap-6 pb-20 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{f.title}</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-gray-200 py-8 dark:border-gray-800">
        <p className="mx-auto max-w-5xl px-4 text-sm text-gray-500 dark:text-gray-400">
          LockedInJobs — a private job application tracker.
        </p>
      </footer>
    </div>
  );
}
