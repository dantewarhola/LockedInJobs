import { describe, expect, it } from 'vitest';
import { applicationsToCSV } from '../lib/csv';
import type { Application, Status } from '../lib/types';

let seq = 0;
function app(partial: Partial<Application>): Application {
  seq += 1;
  return {
    id: `a-${seq}`,
    user_id: 'u1',
    company_name: 'Acme',
    job_title: 'Engineer',
    location: null,
    salary_min: null,
    salary_max: null,
    application_date: '2026-01-01',
    status: 'Applied' as Status,
    dashboard_url: null,
    notes: null,
    favorite: false,
    rejected_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...partial,
  };
}

describe('applicationsToCSV', () => {
  it('writes a header row followed by one row per application', () => {
    const apps = [
      app({ company_name: 'Stripe', job_title: 'Backend Engineer', location: 'Remote', salary_min: 150000 }),
    ];
    const csv = applicationsToCSV(apps, { [apps[0].id]: 5 });
    const rows = csv.split('\r\n');
    expect(rows[0]).toBe(
      'Business,Title,Location,Salary,Applied,Status,Time in stage (days),Link,Favorite',
    );
    expect(rows[1]).toBe('Stripe,Backend Engineer,Remote,"$150,000+",01/01/2026,Applied,5,N/A,No');
  });

  it('quotes fields containing commas, quotes, or newlines', () => {
    const apps = [app({ company_name: 'Acme, Inc.', job_title: 'Says "hi"\nnewline' })];
    const csv = applicationsToCSV(apps, {});
    const rows = csv.split('\r\n');
    expect(rows[1]).toContain('"Acme, Inc."');
    expect(rows[1]).toContain('"Says ""hi""\nnewline"');
  });

  it('falls back to N/A and 0 days for missing optional fields', () => {
    const apps = [app({ location: null, dashboard_url: null })];
    const csv = applicationsToCSV(apps, {});
    const rows = csv.split('\r\n');
    expect(rows[1]).toContain('N/A');
    expect(rows[1]).toContain(',0,');
  });

  it('produces only the header row for an empty list', () => {
    expect(applicationsToCSV([], {})).toBe(
      'Business,Title,Location,Salary,Applied,Status,Time in stage (days),Link,Favorite',
    );
  });
});
