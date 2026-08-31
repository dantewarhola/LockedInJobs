import type { Application } from './types';

/**
 * Case-insensitive substring filter over the fields a user would search by:
 * company name, job title, and location. An empty / whitespace query returns
 * the list unchanged.
 */
export function filterApplications(apps: Application[], query: string): Application[] {
  const q = query.trim().toLowerCase();
  if (!q) return apps;
  return apps.filter(
    (a) =>
      a.company_name.toLowerCase().includes(q) ||
      a.job_title.toLowerCase().includes(q) ||
      (a.location ?? '').toLowerCase().includes(q),
  );
}
