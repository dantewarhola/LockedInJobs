import { describe, expect, it } from 'vitest';
import { credentialsSchema, parseNewCredentials, PASSWORD_MIN } from '../lib/auth-validation';

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

describe('credentialsSchema', () => {
  it('accepts a valid email + password', () => {
    const r = credentialsSchema.safeParse({ email: 'a@b.com', password: 'longenough' });
    expect(r.success).toBe(true);
  });
  it('rejects a bad email', () => {
    expect(credentialsSchema.safeParse({ email: 'nope', password: 'longenough' }).success).toBe(false);
  });
  it(`rejects a password shorter than ${PASSWORD_MIN}`, () => {
    expect(credentialsSchema.safeParse({ email: 'a@b.com', password: 'short' }).success).toBe(false);
  });
});

describe('parseNewCredentials', () => {
  it('returns the trimmed pair when valid and matching', () => {
    const r = parseNewCredentials(fd({ email: '  a@b.com ', password: 'longenough', confirm: 'longenough' }));
    expect(r).toEqual({ ok: true, data: { email: 'a@b.com', password: 'longenough' } });
  });

  it('flags a mismatched confirmation', () => {
    const r = parseNewCredentials(fd({ email: 'a@b.com', password: 'longenough', confirm: 'different!' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.confirm).toMatch(/match/i);
  });

  it('flags a bad email and a short password together', () => {
    const r = parseNewCredentials(fd({ email: 'x', password: 'abc', confirm: 'abc' }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fieldErrors.email).toBeTruthy();
      expect(r.fieldErrors.password).toBeTruthy();
    }
  });

  it('does not add a confirm error when the password itself is invalid', () => {
    const r = parseNewCredentials(fd({ email: 'a@b.com', password: 'abc', confirm: 'nomatch' }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fieldErrors.password).toBeTruthy();
      expect(r.fieldErrors.confirm).toBeUndefined();
    }
  });
});
