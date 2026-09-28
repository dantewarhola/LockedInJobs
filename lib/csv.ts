import { formatDateFull, formatSalaryRange } from './format';
import type { Application } from './types';

const CSV_HEADERS = [
  'Business',
  'Title',
  'Location',
  'Salary',
  'Applied',
  'Status',
  'Time in stage (days)',
  'Link',
  'Favorite',
];

/** Quotes a field only when needed and doubles up any internal quotes, per RFC 4180. */
function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toRow(values: string[]): string {
  return values.map(escapeCsvField).join(',');
}

export function applicationsToCSV(
  applications: Application[],
  stageDays: Record<string, number>,
): string {
  const lines = [toRow(CSV_HEADERS)];
  for (const a of applications) {
    lines.push(
      toRow([
        a.company_name,
        a.job_title,
        a.location ?? 'N/A',
        formatSalaryRange(a.salary_min, a.salary_max),
        formatDateFull(a.application_date),
        a.status,
        String(stageDays[a.id] ?? 0),
        a.dashboard_url ?? 'N/A',
        a.favorite ? 'Yes' : 'No',
      ]),
    );
  }
  return lines.join('\r\n');
}
