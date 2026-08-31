import Link from 'next/link';
import { logout } from '@/app/login/actions';
import ThemeToggle from './ThemeToggle';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/applications', label: 'Applications' },
  { href: '/rejected', label: 'Rejected' },
  { href: '/files', label: 'Files' },
];

export default function Nav() {
  return (
    <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-gray-900 dark:text-gray-100">Job Tracking</span>
          <ul className="flex gap-3 text-sm">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-gray-600 hover:text-blue-700 dark:text-gray-400 dark:hover:text-blue-400"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>
    </header>
  );
}
