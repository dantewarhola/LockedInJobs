import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

const TABS = [
  { path: '', label: 'Dashboard' },
  { path: '/applications', label: 'Applications' },
  { path: '/rejected', label: 'Rejected' },
];

export default function SharedNav({ token }: { token: string }) {
  return (
    <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-gray-900 dark:text-gray-100">LockedInJobs</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            Read-only
          </span>
          <ul className="flex gap-3 text-sm">
            {TABS.map((t) => (
              <li key={t.path}>
                <Link
                  href={`/shared/${token}${t.path}`}
                  className="text-gray-600 hover:text-blue-700 dark:text-gray-400 dark:hover:text-blue-400"
                >
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <ThemeToggle />
      </nav>
    </header>
  );
}
