import CopyLinkButton from '@/components/CopyLinkButton';
import { getMyShareLink } from '@/lib/shareLinks';
import { getSiteUrl } from '@/lib/site-url';
import { deleteShareLink, generateShareLink } from './actions';

export const dynamic = 'force-dynamic';

export default async function SharePage() {
  let link: { token: string; createdAt: string } | null = null;
  let loadError: string | null = null;
  try {
    link = await getMyShareLink();
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'Failed to load your share link.';
  }

  const siteUrl = await getSiteUrl();
  const shareUrl = link ? `${siteUrl}/shared/${link.token}` : null;

  return (
    <section className="max-w-xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Share link</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Generate a read-only link to your Dashboard, Applications, and Rejected pages. Anyone
          with the link can view it without signing in &mdash; they can&apos;t edit or delete
          anything, or follow any job posting links. Delete the link any time to cut off access.
        </p>
      </div>

      {loadError ? (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
        >
          {loadError}
        </p>
      ) : shareUrl ? (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              aria-label="Share link"
              className="min-w-0 flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            />
            <CopyLinkButton value={shareUrl} />
          </div>
          <form action={deleteShareLink}>
            <button
              type="submit"
              className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              Delete link
            </button>
          </form>
        </div>
      ) : (
        <form action={generateShareLink}>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Generate link
          </button>
        </form>
      )}
    </section>
  );
}
