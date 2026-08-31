import { describe, expect, it } from 'vitest';
import { DEFAULT_WEEKLY_GOAL, RESPONSE_STATUSES, TIMED_STAGES } from '../lib/types';

describe('metric status constants', () => {
  it('RESPONSE_STATUSES is the employer-response set', () => {
    expect([...RESPONSE_STATUSES]).toEqual([
      'Online Assessment',
      'Interview',
      'Offer',
      'Rejected',
    ]);
  });

  it('TIMED_STAGES excludes terminal states', () => {
    expect([...TIMED_STAGES]).toEqual(['Applied', 'Online Assessment', 'Interview', 'Offer']);
    for (const terminal of ['Rejected', 'Ghosted', 'Withdrawn', 'N/A']) {
      expect(TIMED_STAGES).not.toContain(terminal);
    }
  });

  it('DEFAULT_WEEKLY_GOAL is 5', () => {
    expect(DEFAULT_WEEKLY_GOAL).toBe(5);
  });
});
