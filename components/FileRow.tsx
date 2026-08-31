'use client';

import { deleteFile, downloadFile } from '@/app/(app)/files/actions';
import { formatBytes, formatDate } from '@/lib/format';
import type { StoredFile } from '@/lib/files';

export default function FileRow({ file }: { file: StoredFile }) {
  return (
    <tr>
      <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{file.name}</td>
      <td className="whitespace-nowrap px-4 py-2 text-gray-700 dark:text-gray-300">{formatBytes(file.size)}</td>
      <td className="whitespace-nowrap px-4 py-2 text-gray-700 dark:text-gray-300">
        {file.createdAt ? formatDate(file.createdAt) : '—'}
      </td>
      <td className="px-4 py-2">
        <div className="flex gap-3">
          <form action={downloadFile}>
            <input type="hidden" name="name" value={file.name} />
            <button type="submit" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
              Download
            </button>
          </form>
          <form
            action={deleteFile}
            onSubmit={(e) => {
              if (!window.confirm(`Delete "${file.name}"? This cannot be undone.`)) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="name" value={file.name} />
            <button type="submit" className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
              Delete
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}
