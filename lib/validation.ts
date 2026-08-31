import { z } from 'zod';
import { STATUS_VALUES } from './types';

const emptyToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

function isValidNonFutureDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return d.getTime() <= endOfToday.getTime();
}

export const applicationSchema = z
  .object({
    company_name: z.string().trim().min(1, 'Company name is required'),
    job_title: z.string().trim().min(1, 'Job title is required'),
    location: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
    salary_min: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int('Must be a whole number').nonnegative('Cannot be negative').optional(),
    ),
    salary_max: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int('Must be a whole number').nonnegative('Cannot be negative').optional(),
    ),
    application_date: z
      .string()
      .refine(isValidNonFutureDate, 'Must be a valid date, not in the future'),
    status: z.enum(STATUS_VALUES),
    dashboard_url: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .url('Must be a valid URL')
        .refine((u) => /^https?:\/\//i.test(u), 'Must start with http:// or https://')
        .optional(),
    ),
    notes: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  })
  .refine(
    (d) => d.salary_min === undefined || d.salary_max === undefined || d.salary_max >= d.salary_min,
    { message: 'Max salary must be greater than or equal to min salary', path: ['salary_max'] },
  );

export type ApplicationInput = z.infer<typeof applicationSchema>;

export function parseApplicationForm(fd: FormData): Record<string, unknown> {
  const get = (k: string) => {
    const v = fd.get(k);
    return typeof v === 'string' ? v : '';
  };
  return {
    company_name: get('company_name'),
    job_title: get('job_title'),
    location: get('location'),
    salary_min: get('salary_min'),
    salary_max: get('salary_max'),
    application_date: get('application_date'),
    status: get('status') || 'Applied',
    dashboard_url: get('dashboard_url'),
    notes: get('notes'),
  };
}

export function toRow(input: ApplicationInput) {
  return {
    company_name: input.company_name,
    job_title: input.job_title,
    location: input.location ?? null,
    salary_min: input.salary_min ?? null,
    salary_max: input.salary_max ?? null,
    application_date: input.application_date,
    status: input.status,
    dashboard_url: input.dashboard_url ?? null,
    notes: input.notes ?? null,
  };
}

export function flattenErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
