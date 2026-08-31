import { describe, expect, it } from 'vitest';
import { filterApplications } from '../lib/search';
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
    rejected_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...partial,
  };
}

describe('filterApplications', () => {
  const apps = [
    app({ company_name: 'Stripe', job_title: 'Backend Engineer', location: 'Remote' }),
    app({ company_name: 'Vercel', job_title: 'Frontend Engineer', location: 'New York' }),
    app({ company_name: 'Linear', job_title: 'Designer', location: null }),
  ];

  it('returns everything for an empty or whitespace query', () => {
    expect(filterApplications(apps, '')).toHaveLength(3);
    expect(filterApplications(apps, '   ')).toHaveLength(3);
  });

  it('matches company name, case-insensitively', () => {
    expect(filterApplications(apps, 'stripe').map((a) => a.company_name)).toEqual(['Stripe']);
  });

  it('matches job title', () => {
    expect(filterApplications(apps, 'engineer').map((a) => a.company_name)).toEqual([
      'Stripe',
      'Vercel',
    ]);
  });

  it('matches location', () => {
    expect(filterApplications(apps, 'new york').map((a) => a.company_name)).toEqual(['Vercel']);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterApplications(apps, 'zzz')).toEqual([]);
  });

  it('does not throw on a null location', () => {
    expect(filterApplications(apps, 'linear').map((a) => a.company_name)).toEqual(['Linear']);
  });
});
