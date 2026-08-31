import { describe, expect, it } from 'vitest';
import { computeStats } from '../lib/stats';
import type { Application, Status } from '../lib/types';

let seq = 0;
function app(partial: Partial<Application>): Application {
  seq += 1;
  return {
    id: `id-${seq}`,
    user_id: 'u1',
    company_name: 'Acme',
    job_title: 'Engineer',
    location: null,
    salary_min: null,
    salary_max: null,
    application_date: '2024-01-15',
    status: 'Applied' as Status,
    dashboard_url: null,
    notes: null,
    rejected_at: null,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    ...partial,
  };
}

describe('computeStats', () => {
  it('handles an empty list', () => {
    const s = computeStats([]);
    expect(s.total).toBe(0);
    expect(s.open).toBe(0);
    expect(s.interviews).toEqual({ count: 0, rate: 0 });
    expect(s.avgSalary).toBeNull();
    expect(s.overTime).toEqual([]);
    expect(s.statusBreakdown.every((b) => b.count === 0)).toBe(true);
    expect(s.statusBreakdown).toHaveLength(7);
  });

  it('counts total and open (open excludes Rejected/Withdrawn/Ghosted)', () => {
    const s = computeStats([
      app({ status: 'Applied' }),
      app({ status: 'Interview' }),
      app({ status: 'Rejected' }),
      app({ status: 'Withdrawn' }),
      app({ status: 'Ghosted' }),
    ]);
    expect(s.total).toBe(5);
    expect(s.open).toBe(2);
  });

  it('counts interviews as Interview or Offer, offers as Offer only', () => {
    const s = computeStats([
      app({ status: 'Interview' }),
      app({ status: 'Offer' }),
      app({ status: 'Applied' }),
      app({ status: 'Applied' }),
    ]);
    expect(s.interviews.count).toBe(2);
    expect(s.interviews.rate).toBeCloseTo(0.5);
    expect(s.offers.count).toBe(1);
    expect(s.offers.rate).toBeCloseTo(0.25);
  });

  it('counts rejections and rate', () => {
    const s = computeStats([app({ status: 'Rejected' }), app({ status: 'Rejected' }), app({})]);
    expect(s.rejections.count).toBe(2);
    expect(s.rejections.rate).toBeCloseTo(2 / 3);
  });

  it('averages salary midpoints, ignoring rows missing either bound', () => {
    const s = computeStats([
      app({ salary_min: 80000, salary_max: 120000 }),
      app({ salary_min: 100000, salary_max: 100000 }),
      app({ salary_min: 90000, salary_max: null }),
      app({ salary_min: null, salary_max: null }),
    ]);
    expect(s.avgSalary).toBe(100000);
  });

  it('returns null avgSalary when no row has both bounds', () => {
    const s = computeStats([app({ salary_min: 90000 }), app({})]);
    expect(s.avgSalary).toBeNull();
  });

  it('groups applications by month, sorted ascending', () => {
    const s = computeStats([
      app({ application_date: '2024-03-02' }),
      app({ application_date: '2024-01-31' }),
      app({ application_date: '2024-01-01' }),
    ]);
    expect(s.overTime).toEqual([
      { month: '2024-01', count: 2 },
      { month: '2024-03', count: 1 },
    ]);
  });

  it('produces a status breakdown covering every status value', () => {
    const s = computeStats([
      app({ status: 'Applied' }),
      app({ status: 'Applied' }),
      app({ status: 'Offer' }),
    ]);
    const map = Object.fromEntries(s.statusBreakdown.map((b) => [b.status, b.count]));
    expect(map.Applied).toBe(2);
    expect(map.Offer).toBe(1);
    expect(map.Rejected).toBe(0);
    expect(s.statusBreakdown).toHaveLength(7);
  });
});
