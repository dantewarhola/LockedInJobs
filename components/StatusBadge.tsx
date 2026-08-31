import type { Status } from '@/lib/types';

const styles: Record<Status, string> = {
  Applied: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'Online Assessment': 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  Interview: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  Offer: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  Rejected: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  Withdrawn: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  Ghosted: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  'N/A': 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}
