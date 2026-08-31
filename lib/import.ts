import { readSheet } from 'read-excel-file/node';
import { STATUS_VALUES, type Status } from './types';
import { applicationSchema, flattenErrors, toRow } from './validation';

export const REQUIRED_HEADERS = [
  'Business',
  'Job Title',
  'Location',
  'Salary',
  'Application Date',
  'Status',
  'Link',
] as const;

export type RawRecord = Record<(typeof REQUIRED_HEADERS)[number], unknown>;

export interface ImportValues {
  company_name: string;
  job_title: string;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  application_date: string;
  status: Status;
  dashboard_url: string | null;
  notes: null;
}

export interface PreviewRow {
  /** 1-based spreadsheet row number (header is row 1). */
  index: number;
  raw: RawRecord;
  values?: ImportValues;
  errors: string[];
}

const isNa = (s: string) => /^n\/?a$/i.test(s.trim());

function cellToString(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

export function parseSalary(raw: unknown): { salary_min: number | null; salary_max: number | null } {
  const s = cellToString(raw);
  if (s === '' || isNa(s)) return { salary_min: null, salary_max: null };
  const nums = s.replace(/[$,]/g, '').match(/\d+(?:\.\d+)?/g);
  if (!nums || nums.length === 0) return { salary_min: null, salary_max: null };
  const toInt = (n: string) => Math.round(parseFloat(n));
  if (nums.length === 1) return { salary_min: toInt(nums[0]), salary_max: null };
  return { salary_min: toInt(nums[0]), salary_max: toInt(nums[1]) };
}

export function normalizeStatus(raw: unknown): Status | null {
  const s = cellToString(raw);
  if (s === '') return 'N/A';
  const match = STATUS_VALUES.find((v) => v.toLowerCase() === s.toLowerCase());
  return match ?? null;
}

export function normalizeDate(raw: unknown): string | null {
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw.toISOString().slice(0, 10);
  }
  const s = cellToString(raw);
  if (s === '') return null;

  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;

  // Year-less "M/D" — assume the current year.
  m = s.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (m) {
    return `${new Date().getFullYear()}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  }

  // Fall back to the engine's parser. For a year-less month name like "Jan 5"
  // it would otherwise default to 2001, so append the current year first —
  // but only when the string actually contains a month name, so genuine
  // garbage still fails to parse.
  const hasYear = /\d{4}/.test(s);
  const hasMonthName = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(s);
  const d =
    hasYear || !hasMonthName ? new Date(s) : new Date(`${s} ${new Date().getFullYear()}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function recordToRow(raw: RawRecord, index: number): PreviewRow {
  const errors: string[] = [];

  const status = normalizeStatus(raw.Status);
  if (status === null) {
    errors.push(`Status "${cellToString(raw.Status)}" is not one of the allowed values`);
  }

  const salary = parseSalary(raw.Salary);
  const date = normalizeDate(raw['Application Date']);
  if (date === null) {
    errors.push(`Application Date "${cellToString(raw['Application Date'])}" is not a valid date`);
  }

  const locationRaw = cellToString(raw.Location);
  const linkRaw = cellToString(raw.Link);

  const candidate = {
    company_name: cellToString(raw.Business),
    job_title: cellToString(raw['Job Title']),
    location: isNa(locationRaw) ? '' : locationRaw,
    salary_min: salary.salary_min === null ? '' : String(salary.salary_min),
    salary_max: salary.salary_max === null ? '' : String(salary.salary_max),
    application_date: date ?? '',
    status: status ?? '',
    dashboard_url: isNa(linkRaw) ? '' : linkRaw,
    notes: '',
  };

  const parsed = applicationSchema.safeParse(candidate);
  if (!parsed.success) {
    for (const message of Object.values(flattenErrors(parsed.error))) {
      // status / date already reported with friendlier text above
      if (status === null && /status/i.test(message)) continue;
      if (date === null && /date/i.test(message)) continue;
      errors.push(message);
    }
  }

  if (errors.length > 0 || !parsed.success) {
    return { index, raw, errors };
  }

  const row = toRow(parsed.data);
  return {
    index,
    raw,
    values: { ...row, notes: null },
    errors: [],
  };
}

export async function parseWorkbook(input: Buffer): Promise<PreviewRow[]> {
  const rows = (await readSheet(input)) as unknown[][];
  if (rows.length === 0) throw new Error('The spreadsheet has no rows.');

  const headers = rows[0].map((c) => cellToString(c));
  const missing = REQUIRED_HEADERS.filter(
    (h) => !headers.some((x) => x.toLowerCase() === h.toLowerCase()),
  );
  if (missing.length > 0) {
    throw new Error(`Missing required column(s): ${missing.join(', ')}`);
  }

  const colOf = (h: string) => headers.findIndex((x) => x.toLowerCase() === h.toLowerCase());
  const idx = Object.fromEntries(REQUIRED_HEADERS.map((h) => [h, colOf(h)])) as Record<
    (typeof REQUIRED_HEADERS)[number],
    number
  >;

  const out: PreviewRow[] = [];
  rows.slice(1).forEach((cells, i) => {
    const raw = Object.fromEntries(
      REQUIRED_HEADERS.map((h) => [h, cells[idx[h]] ?? null]),
    ) as RawRecord;

    const empty = REQUIRED_HEADERS.every((h) => cellToString(raw[h]) === '');
    if (empty) return;

    out.push(recordToRow(raw, i + 2));
  });

  return out;
}
