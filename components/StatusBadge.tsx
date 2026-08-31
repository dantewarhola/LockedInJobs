import type { Status } from '@/lib/types';

const styles: Record<Status, string> = {
  Applied: 'bg-blue-50 text-blue-700',
  'Online Assessment': 'bg-indigo-50 text-indigo-700',
  Interview: 'bg-amber-50 text-amber-700',
  Offer: 'bg-green-50 text-green-700',
  Rejected: 'bg-red-50 text-red-700',
  Withdrawn: 'bg-gray-100 text-gray-600',
  Ghosted: 'bg-gray-100 text-gray-500',
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
