import { describe, expect, it } from 'vitest';
import { DEFAULT_WEEKLY_GOAL } from '../lib/types';

describe('DEFAULT_WEEKLY_GOAL', () => {
  it('is 5', () => {
    expect(DEFAULT_WEEKLY_GOAL).toBe(5);
  });
});
