import FileRow from '@/components/FileRow';
import FileUpload from '@/components/FileUpload';
import { listFiles, type StoredFile } from '@/lib/files';

export const dynamic = 'force-dynamic';

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: queryError } = await searchParams;

  let files: StoredFile[] = [];
  let loadError: string | null = null;
  try {
    files = await listFiles();
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'Failed to load files.';
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Files</h1>
        <p className="mt-1 text-sm text-gray-500">
          PDF only, up to 15 MB each — resumes, cover letters, certifications, letters of
          recommendation. Only you can see or download these.
        </p>
      </div>

      <FileUpload />

      {queryError === 'download' && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Could not generate a download link. Try again.
        </p>
      )}

      {loadError ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      ) : files.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-300 p-6 text-center text-gray-500">
          No files yet. Upload your first PDF above.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Size</th>
                <th className="px-4 py-2">Uploaded</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {files.map((f) => (
                <FileRow key={f.name} file={f} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
