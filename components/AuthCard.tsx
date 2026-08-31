import Link from 'next/link';

export const authFieldClass =
  'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600';

export const authErrorClass = 'mt-1 text-sm text-red-600';

export default function AuthCard({
  title,
  children,
  links,
}: {
  title: string;
  children: React.ReactNode;
  links?: { href: string; label: string }[];
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">Job Tracking</h1>
      <p className="mb-6 text-sm text-gray-500">{title}</p>
      {children}
      {links && links.length > 0 && (
        <div className="mt-4 flex justify-between text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-blue-600 hover:underline">
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
