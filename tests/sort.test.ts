import { describe, expect, it } from 'vitest';
import { sortApplications } from '../lib/sort';
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

describe('sortApplications', () => {
  const apps = [
    app({ company_name: 'Vercel', salary_min: 150000, application_date: '2026-02-01', status: 'Interview' }),
    app({ company_name: 'Acme', salary_min: 100000, application_date: '2026-01-15', status: 'Applied' }),
    app({ company_name: 'Linear', salary_min: null, application_date: '2026-03-01', status: 'Offer' }),
  ];
  const stageDays = { [apps[0].id]: 10, [apps[1].id]: 3, [apps[2].id]: 20 };

  it('sorts by company name ascending', () => {
    expect(sortApplications(apps, 'company_name', 'asc', stageDays).map((a) => a.company_name)).toEqual([
      'Acme',
      'Linear',
      'Vercel',
    ]);
  });

  it('sorts by company name descending', () => {
    expect(sortApplications(apps, 'company_name', 'desc', stageDays).map((a) => a.company_name)).toEqual([
      'Vercel',
      'Linear',
      'Acme',
    ]);
  });

  it('sorts by application date', () => {
    expect(
      sortApplications(apps, 'application_date', 'asc', stageDays).map((a) => a.company_name),
    ).toEqual(['Acme', 'Vercel', 'Linear']);
  });

  it('sorts by status alphabetically', () => {
    expect(sortApplications(apps, 'status', 'asc', stageDays).map((a) => a.status)).toEqual([
      'Applied',
      'Interview',
      'Offer',
    ]);
  });

  it('sorts by time in stage using the stageDays map', () => {
    expect(sortApplications(apps, 'time', 'asc', stageDays).map((a) => a.company_name)).toEqual([
      'Acme',
      'Vercel',
      'Linear',
    ]);
  });

  it('puts null salary last regardless of direction', () => {
    expect(sortApplications(apps, 'salary', 'asc', stageDays).map((a) => a.company_name)).toEqual([
      'Acme',
      'Vercel',
      'Linear',
    ]);
    expect(sortApplications(apps, 'salary', 'desc', stageDays).map((a) => a.company_name)).toEqual([
      'Vercel',
      'Acme',
      'Linear',
    ]);
  });

  it('does not mutate the original array', () => {
    const copy = [...apps];
    sortApplications(apps, 'company_name', 'asc', stageDays);
    expect(apps).toEqual(copy);
  });
});
