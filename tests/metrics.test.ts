import { describe, expect, it } from 'vitest';
import {
  median,
  medianDaysInStage,
  medianDaysToFirstResponse,
  streak,
  toLocalDateString,
  weeklyProgress,
} from '../lib/metrics';
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
function app(application_date: string, status: Status = 'Applied'): Application {
  seq += 1;
  return {
    id: `a-${seq}`,
    user_id: 'u1',
    company_name: 'Acme',
    job_title: 'Eng',
    location: null,
    salary_min: null,
    salary_max: null,
    application_date,
    status,
    dashboard_url: null,
    notes: null,
    rejected_at: null,
    created_at: `${application_date}T00:00:00Z`,
    updated_at: `${application_date}T00:00:00Z`,
  };
}
const D = 'T00:00:00Z';

describe('median', () => {
  it('null for empty', () => expect(median([])).toBeNull());
  it('single value', () => expect(median([4])).toBe(4));
  it('odd count returns the middle', () => expect(median([5, 1, 3])).toBe(3));
  it('even count returns the mean of the two middles', () => expect(median([1, 2, 3, 4])).toBe(2.5));
});

describe('medianDaysToFirstResponse', () => {
  it('null when nobody responded', () => {
    expect(medianDaysToFirstResponse([ev('a1', 'Applied', `2026-01-01${D}`)])).toBeNull();
  });

  it('measures applied -> first response in days', () => {
    const events = [
      ev('a1', 'Applied', `2026-01-01${D}`),
      ev('a1', 'Interview', `2026-01-04${D}`, 'Applied'),
    ];
    expect(medianDaysToFirstResponse(events)).toBe(3);
  });

  it('does not treat Ghosted or Withdrawn as a response', () => {
    const events = [
      ev('a1', 'Applied', `2026-01-01${D}`),
      ev('a1', 'Ghosted', `2026-01-10${D}`, 'Applied'),
      ev('a2', 'Applied', `2026-01-01${D}`),
      ev('a2', 'Withdrawn', `2026-01-05${D}`, 'Applied'),
    ];
    expect(medianDaysToFirstResponse(events)).toBeNull();
  });

  it('uses the earliest response event', () => {
    const events = [
      ev('a1', 'Applied', `2026-01-01${D}`),
      ev('a1', 'Online Assessment', `2026-01-03${D}`, 'Applied'),
      ev('a1', 'Interview', `2026-01-09${D}`, 'Online Assessment'),
    ];
    expect(medianDaysToFirstResponse(events)).toBe(2);
  });

  it('takes the median across applications', () => {
    const events = [
      ev('a1', 'Applied', `2026-01-01${D}`),
      ev('a1', 'Interview', `2026-01-03${D}`, 'Applied'), // 2
      ev('a2', 'Applied', `2026-01-01${D}`),
      ev('a2', 'Interview', `2026-01-05${D}`, 'Applied'), // 4
      ev('a3', 'Applied', `2026-01-01${D}`),
      ev('a3', 'Rejected', `2026-01-13${D}`, 'Applied'), // 12
    ];
    expect(medianDaysToFirstResponse(events)).toBe(4);
  });
});

describe('medianDaysInStage', () => {
  it('measures each closed stage and the open current stage', () => {
    const events = [
      ev('a1', 'Applied', `2026-01-01${D}`),
      ev('a1', 'Online Assessment', `2026-01-03${D}`, 'Applied'), // Applied: 2
      ev('a1', 'Interview', `2026-01-06${D}`, 'Online Assessment'), // OA: 3
      ev('a1', 'Offer', `2026-01-11${D}`, 'Interview'), // Interview: 5
    ];
    const now = new Date(`2026-01-13${D}`); // Offer open: 2
    expect(medianDaysInStage(events, now)).toEqual([
      { stage: 'Applied', medianDays: 2, count: 1 },
      { stage: 'Online Assessment', medianDays: 3, count: 1 },
      { stage: 'Interview', medianDays: 5, count: 1 },
      { stage: 'Offer', medianDays: 2, count: 1 },
    ]);
  });

  it('does not count terminal stages', () => {
    const events = [
      ev('a1', 'Applied', `2026-01-01${D}`),
      ev('a1', 'Rejected', `2026-01-05${D}`, 'Applied'), // Applied: 4
    ];
    expect(medianDaysInStage(events, new Date(`2026-01-20${D}`))).toEqual([
      { stage: 'Applied', medianDays: 4, count: 1 },
    ]);
  });

  it('ignores an application that only has a seed event', () => {
    const events = [ev('a1', 'Applied', `2026-01-01${D}`)];
    expect(medianDaysInStage(events, new Date(`2026-02-01${D}`))).toEqual([]);
  });

  it('returns stages in canonical order with medians across applications', () => {
    const events = [
      ev('a1', 'Applied', `2026-01-01${D}`),
      ev('a1', 'Interview', `2026-01-03${D}`, 'Applied'), // Applied 2, Interview open
      ev('a2', 'Applied', `2026-01-01${D}`),
      ev('a2', 'Interview', `2026-01-07${D}`, 'Applied'), // Applied 6, Interview open
    ];
    const now = new Date(`2026-01-08${D}`); // a1 Interview 5, a2 Interview 1
    const out = medianDaysInStage(events, now);
    expect(out[0]).toEqual({ stage: 'Applied', medianDays: 4, count: 2 });
    expect(out[1]).toEqual({ stage: 'Interview', medianDays: 3, count: 2 });
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
      app('2026-01-05'), // Mon — in
      app('2026-01-06'), // Tue — in
      app('2026-01-07'), // Wed — in
      app('2026-01-04'), // prev Sun — out
    ];
    const r = weeklyProgress(apps, now, 5);
    expect(r.weekStart).toBe('2026-01-05');
    expect(r.count).toBe(3);
    expect(r.goal).toBe(5);
    expect(r.pct).toBe(60);
  });

  it('caps pct at 100 when the goal is exceeded', () => {
    const now = new Date(2026, 0, 7, 12, 0, 0);
    const apps = [app('2026-01-05'), app('2026-01-05'), app('2026-01-06')];
    expect(weeklyProgress(apps, now, 2).pct).toBe(100);
  });
});

describe('streak', () => {
  it('counts consecutive days ending today', () => {
    const now = new Date(2026, 2, 10, 9, 0, 0); // 2026-03-10
    const apps = [
      app('2026-03-10'),
      app('2026-03-09'),
      app('2026-03-08'),
      app('2026-03-06'),
    ];
    expect(streak(apps, now)).toEqual({ current: 3, longest: 3 });
  });

  it('keeps the streak alive when today is empty but yesterday is not', () => {
    const now = new Date(2026, 2, 10, 9, 0, 0);
    const apps = [app('2026-03-09'), app('2026-03-08')];
    expect(streak(apps, now).current).toBe(2);
  });

  it('is zero when neither today nor yesterday has an application', () => {
    const now = new Date(2026, 2, 10, 9, 0, 0);
    const apps = [app('2026-03-01'), app('2026-03-02'), app('2026-03-03')];
    const r = streak(apps, now);
    expect(r.current).toBe(0);
    expect(r.longest).toBe(3);
  });

  it('returns zeros for no applications', () => {
    expect(streak([], new Date())).toEqual({ current: 0, longest: 0 });
  });
});
