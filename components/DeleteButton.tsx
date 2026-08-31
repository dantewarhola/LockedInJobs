'use client';

import { deleteApplication } from '@/app/(app)/applications/actions';

export default function DeleteButton({ id, label = 'Delete' }: { id: string; label?: string }) {
  return (
    <form
      action={deleteApplication}
      onSubmit={(e) => {
        if (!window.confirm('Delete this application? This cannot be undone.')) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
      >
        {label}
      </button>
    </form>
  );
}
