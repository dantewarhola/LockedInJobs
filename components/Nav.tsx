import Link from 'next/link';
import { logout } from '@/app/login/actions';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/applications', label: 'Applications' },
  { href: '/rejected', label: 'Rejected' },
  { href: '/files', label: 'Files' },
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
