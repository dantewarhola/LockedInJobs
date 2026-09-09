'use client';

import { toggleFavorite } from '@/app/(app)/applications/actions';

export default function FavoriteButton({ id, favorite }: { id: string; favorite: boolean }) {
  return (
    <form action={toggleFavorite} className="flex">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="favorite" value={favorite ? 'false' : 'true'} />
      <button
        type="submit"
        aria-pressed={favorite}
        aria-label={favorite ? 'Unfavorite this application' : 'Favorite this application'}
        title={favorite ? 'Unfavorite' : 'Favorite'}
        className={
          favorite
            ? 'text-yellow-500 hover:text-yellow-600'
            : 'text-gray-300 hover:text-yellow-500 dark:text-gray-600 dark:hover:text-yellow-500'
        }
      >
        <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
          <path
            d="M10 1.6l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.2l-4.95 2.6.94-5.5-4-3.9 5.53-.8L10 1.6z"
            fill={favorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </form>
  );
}
