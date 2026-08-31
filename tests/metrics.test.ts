import { describe, expect, it } from 'vitest';
import { daysInCurrentStage, streak, toLocalDateString, weeklyProgress } from '../lib/metrics';
import type { Application, ApplicationEvent, Status } from '../lib/types';

let seq = 0;
function ev(
  application_id: string,
  to_status: Status,
  changed_at: string,
  from_status: Status | null = null,
): ApplicationEvent {
  seq += 1;
  return { id: `e-${seq}`, application_id, user_id: 'u1', from_status, to_status, changed_at };
}
function app(partial: Partial<Application>): Application {
  seq += 1;
  return {
    id: `a-${seq}`,
    user_id: 'u1',
    company_name: 'Acme',
    job_title: 'Eng',
    location: null,
    salary_min: null,
    salary_max: null,
    application_date: '2026-01-01',
    status: 'Applied',
    dashboard_url: null,
    notes: null,
    rejected_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...partial,
  };
}
const D = 'T00:00:00Z';

describe('daysInCurrentStage', () => {
  it('measures an Applied application from its application_date', () => {
    const a = app({ id: 'a1', status: 'Applied', application_date: '2026-01-01' });
    const events = [ev('a1', 'Applied', `2026-01-01${D}`)];
    // `now` built in local time to match the local-midnight application_date anchor
    expect(daysInCurrentStage(a, events, new Date(2026, 0, 11))).toBe(10);
  });

  it('measures a non-Applied application from when it entered that stage', () => {
    const a = app({ id: 'a1', status: 'Interview', application_date: '2026-01-01' });
    const events = [
      ev('a1', 'Applied', `2026-01-01${D}`),
      ev('a1', 'Online Assessment', `2026-01-04${D}`, 'Applied'),
      ev('a1', 'Interview', `2026-01-09${D}`, 'Online Assessment'),
    ];
    expect(daysInCurrentStage(a, events, new Date(`2026-01-12${D}`))).toBe(3);
  });

  it('uses the most recent entry into the current stage', () => {
    const a = app({ id: 'a1', status: 'Interview', application_date: '2026-01-01' });
    const events = [
      ev('a1', 'Applied', `2026-01-01${D}`),
      ev('a1', 'Interview', `2026-01-05${D}`, 'Applied'),
      ev('a1', 'Applied', `2026-01-07${D}`, 'Interview'),
      ev('a1', 'Interview', `2026-01-10${D}`, 'Applied'),
    ];
    expect(daysInCurrentStage(a, events, new Date(`2026-01-13${D}`))).toBe(3);
  });

  it('goes back to the application_date when changed back to Applied', () => {
    const a = app({ id: 'a1', status: 'Applied', application_date: '2026-01-01' });
    const events = [
      ev('a1', 'Applied', `2026-01-01${D}`),
      ev('a1', 'Interview', `2026-01-05${D}`, 'Applied'),
      ev('a1', 'Applied', `2026-01-20${D}`, 'Interview'),
    ];
    expect(daysInCurrentStage(a, events, new Date(2026, 0, 11))).toBe(10);
  });

  it('falls back to application_date when no matching event exists', () => {
    const a = app({ id: 'a1', status: 'Interview', application_date: '2026-01-01' });
    const events = [ev('a1', 'Applied', `2026-01-01${D}`)]; // backfilled seed only
    expect(daysInCurrentStage(a, events, new Date(2026, 0, 6))).toBe(5);
  });

  it('never returns a negative number', () => {
    const a = app({ id: 'a1', status: 'Applied', application_date: '2026-01-10' });
    expect(daysInCurrentStage(a, [], new Date(`2026-01-01${D}`))).toBe(0);
  });
});

describe('toLocalDateString', () => {
  it('formats local Y-M-D zero padded', () => {
    expect(toLocalDateString(new Date(2026, 0, 5, 23, 0, 0))).toBe('2026-01-05');
  });
});

describe('weeklyProgress', () => {
  it('counts applications from Monday of the current week through today', () => {
    const now = new Date(2026, 0, 7, 12, 0, 0); // Wed 2026-01-07 local
    const apps = [
      app({ application_date: '2026-01-05' }), // Mon — in
      app({ application_date: '2026-01-06' }), // Tue — in
      app({ application_date: '2026-01-07' }), // Wed — in
      app({ application_date: '2026-01-04' }), // prev Sun — out
    ];
    const r = weeklyProgress(apps, now, 5);
    expect(r.weekStart).toBe('2026-01-05');
    expect(r.count).toBe(3);
    expect(r.goal).toBe(5);
    expect(r.pct).toBe(60);
  });

  it('caps pct at 100 when the goal is exceeded', () => {
    const now = new Date(2026, 0, 7, 12, 0, 0);
    const apps = [
      app({ application_date: '2026-01-05' }),
      app({ application_date: '2026-01-05' }),
      app({ application_date: '2026-01-06' }),
    ];
    expect(weeklyProgress(apps, now, 2).pct).toBe(100);
  });
});

describe('streak', () => {
  it('counts consecutive days ending today', () => {
    const now = new Date(2026, 2, 10, 9, 0, 0); // 2026-03-10
    const apps = [
      app({ application_date: '2026-03-10' }),
      app({ application_date: '2026-03-09' }),
      app({ application_date: '2026-03-08' }),
      app({ application_date: '2026-03-06' }),
    ];
    expect(streak(apps, now)).toEqual({ current: 3, longest: 3 });
  });

  it('keeps the streak alive when today is empty but yesterday is not', () => {
    const now = new Date(2026, 2, 10, 9, 0, 0);
    const apps = [app({ application_date: '2026-03-09' }), app({ application_date: '2026-03-08' })];
    expect(streak(apps, now).current).toBe(2);
  });

  it('is zero when neither today nor yesterday has an application', () => {
    const now = new Date(2026, 2, 10, 9, 0, 0);
    const apps = [
      app({ application_date: '2026-03-01' }),
      app({ application_date: '2026-03-02' }),
      app({ application_date: '2026-03-03' }),
    ];
    const r = streak(apps, now);
    expect(r.current).toBe(0);
    expect(r.longest).toBe(3);
  });

  it('returns zeros for no applications', () => {
    expect(streak([], new Date())).toEqual({ current: 0, longest: 0 });
  });
});
