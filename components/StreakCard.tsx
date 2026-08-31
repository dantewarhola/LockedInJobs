function dayWord(n: number): string {
  return n === 1 ? 'day' : 'days';
}

export default function StreakCard({ current, longest }: { current: number; longest: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Streak</h2>
      <p className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
        {current} {dayWord(current)}
      </p>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
        {current === 0
          ? 'Add an application to start a streak'
          : `Best: ${longest} ${dayWord(longest)}`}
      </p>
    </div>
  );
}
