import { describe, expect, it } from 'vitest';
import {
  applicationSchema,
  flattenErrors,
  parseApplicationForm,
  toRow,
  weeklyGoalSchema,
} from '../lib/validation';

const base = {
  company_name: 'Acme',
  job_title: 'Engineer',
  location: '',
  salary_min: '',
  salary_max: '',
  application_date: '2020-01-01',
  status: 'Applied',
  dashboard_url: '',
  notes: '',
};

describe('applicationSchema', () => {
  it('accepts a minimal valid application', () => {
    const r = applicationSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it('requires company_name and job_title', () => {
    const r = applicationSchema.safeParse({ ...base, company_name: '  ', job_title: '' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const errs = flattenErrors(r.error);
      expect(errs.company_name).toBeTruthy();
      expect(errs.job_title).toBeTruthy();
    }
  });

  it('rejects a future application_date', () => {
    const r = applicationSchema.safeParse({ ...base, application_date: '2999-01-01' });
    expect(r.success).toBe(false);
  });

  it('rejects an invalid application_date', () => {
    const r = applicationSchema.safeParse({ ...base, application_date: 'not-a-date' });
    expect(r.success).toBe(false);
  });

  it('rejects salary_max less than salary_min', () => {
    const r = applicationSchema.safeParse({ ...base, salary_min: '100000', salary_max: '80000' });
    expect(r.success).toBe(false);
    if (!r.success) expect(flattenErrors(r.error).salary_max).toBeTruthy();
  });

  it('accepts only salary_min with no salary_max', () => {
    const r = applicationSchema.safeParse({ ...base, salary_min: '90000' });
    expect(r.success).toBe(true);
  });

  it('rejects negative salary', () => {
    const r = applicationSchema.safeParse({ ...base, salary_min: '-5' });
    expect(r.success).toBe(false);
  });

  it('rejects a non-http dashboard_url', () => {
    const r = applicationSchema.safeParse({ ...base, dashboard_url: 'ftp://x.y' });
    expect(r.success).toBe(false);
  });

  it('accepts a valid https dashboard_url', () => {
    const r = applicationSchema.safeParse({ ...base, dashboard_url: 'https://jobs.acme.com/123' });
    expect(r.success).toBe(true);
  });

  it('rejects an unknown status', () => {
    const r = applicationSchema.safeParse({ ...base, status: 'Maybe' });
    expect(r.success).toBe(false);
  });
});

describe('toRow', () => {
  it('maps empty optionals to null and keeps required fields', () => {
    const parsed = applicationSchema.parse(base);
    const row = toRow(parsed);
    expect(row).toEqual({
      company_name: 'Acme',
      job_title: 'Engineer',
      location: null,
      salary_min: null,
      salary_max: null,
      application_date: '2020-01-01',
      status: 'Applied',
      dashboard_url: null,
      notes: null,
    });
  });

  it('keeps provided optional values', () => {
    const parsed = applicationSchema.parse({
      ...base,
      location: 'Remote',
      salary_min: '80000',
      salary_max: '120000',
      dashboard_url: 'https://x.com/a',
      notes: 'referred by a friend',
    });
    const row = toRow(parsed);
    expect(row.location).toBe('Remote');
    expect(row.salary_min).toBe(80000);
    expect(row.salary_max).toBe(120000);
    expect(row.dashboard_url).toBe('https://x.com/a');
    expect(row.notes).toBe('referred by a friend');
  });
});

describe('parseApplicationForm', () => {
  it('reads all fields from FormData with empty-string defaults', () => {
    const fd = new FormData();
    fd.set('company_name', 'Acme');
    fd.set('job_title', 'Engineer');
    fd.set('application_date', '2020-01-01');
    fd.set('status', 'Applied');
    const obj = parseApplicationForm(fd);
    expect(obj).toMatchObject({
      company_name: 'Acme',
      job_title: 'Engineer',
      location: '',
      salary_min: '',
      salary_max: '',
      application_date: '2020-01-01',
      status: 'Applied',
      dashboard_url: '',
      notes: '',
    });
  });
});

describe('weeklyGoalSchema', () => {
  it('accepts whole numbers 1 through 100', () => {
    expect(weeklyGoalSchema.parse('5')).toBe(5);
    expect(weeklyGoalSchema.parse('1')).toBe(1);
    expect(weeklyGoalSchema.parse('100')).toBe(100);
  });

  it('rejects zero, negatives, over 100, and non-integers', () => {
    expect(weeklyGoalSchema.safeParse('0').success).toBe(false);
    expect(weeklyGoalSchema.safeParse('-3').success).toBe(false);
    expect(weeklyGoalSchema.safeParse('101').success).toBe(false);
    expect(weeklyGoalSchema.safeParse('2.5').success).toBe(false);
    expect(weeklyGoalSchema.safeParse('abc').success).toBe(false);
  });
});
