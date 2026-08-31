import { describe, expect, it } from 'vitest';
import { formatDate, formatPercent, formatSalaryRange, formatUSD } from '../lib/format';

describe('formatUSD', () => {
  it('formats null as N/A', () => expect(formatUSD(null)).toBe('N/A'));
  it('formats an integer with separators', () => expect(formatUSD(1234567)).toBe('$1,234,567'));
});

describe('formatSalaryRange', () => {
  it('N/A when both null', () => expect(formatSalaryRange(null, null)).toBe('N/A'));
  it('single bound with plus/minus wording', () => {
    expect(formatSalaryRange(90000, null)).toBe('$90,000+');
    expect(formatSalaryRange(null, 90000)).toBe('Up to $90,000');
  });
  it('full range', () => expect(formatSalaryRange(80000, 120000)).toBe('$80,000 – $120,000'));
});

describe('formatPercent', () => {
  it('rounds to a whole percent', () => {
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(0.4266)).toBe('43%');
    expect(formatPercent(1)).toBe('100%');
  });
});

describe('formatDate', () => {
  it('formats an ISO date as zero-padded DD/MM', () => {
    expect(formatDate('2024-01-05')).toBe('05/01');
    expect(formatDate('2026-12-31')).toBe('31/12');
  });
  it('formats an ISO timestamp by its date part', () => {
    expect(formatDate('2026-03-09T14:20:00Z')).toBe('09/03');
  });
});
