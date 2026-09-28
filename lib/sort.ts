import type { Application } from './types';

export const SORT_KEYS = [
  'company_name',
  'job_title',
  'location',
  'salary',
  'application_date',
  'status',
  'time',
] as const;

export type SortKey = (typeof SORT_KEYS)[number];
export type SortDirection = 'asc' | 'desc';

// Nulls always sort last, regardless of direction, so the `sign` flip only
// ever applies to two non-null values — otherwise a descending sort would
// push "N/A" rows to the top instead of the bottom.
function compareStrings(a: string | null, b: string | null, sign: number): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return sign * a.localeCompare(b);
}

function compareNumbers(a: number | null, b: number | null, sign: number): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return sign * (a - b);
}

export function sortApplications(
  applications: Application[],
  key: SortKey,
  direction: SortDirection,
  stageDays: Record<string, number>,
): Application[] {
  const sign = direction === 'asc' ? 1 : -1;
  return [...applications].sort((a, b) => {
    switch (key) {
      case 'company_name':
        return compareStrings(a.company_name, b.company_name, sign);
      case 'job_title':
        return compareStrings(a.job_title, b.job_title, sign);
      case 'location':
        return compareStrings(a.location, b.location, sign);
      case 'salary':
        return compareNumbers(a.salary_min, b.salary_min, sign);
      case 'application_date':
        return compareStrings(a.application_date, b.application_date, sign);
      case 'status':
        return compareStrings(a.status, b.status, sign);
      case 'time':
        return compareNumbers(stageDays[a.id] ?? 0, stageDays[b.id] ?? 0, sign);
      default:
        return 0;
    }
  });
}
