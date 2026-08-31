import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Page not found</h1>
      <Link href="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400">
        Back to dashboard
      </Link>
    </main>
  );
}
