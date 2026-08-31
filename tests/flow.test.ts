import { describe, expect, it } from 'vitest';
import { computeFlow } from '../lib/flow';
import type { Application, Status } from '../lib/types';

let seq = 0;
function mk(status: Status, n: number): Application[] {
  return Array.from({ length: n }, () => {
    seq += 1;
    return {
      id: `id-${seq}`,
      user_id: 'u1',
      company_name: 'Acme',
      job_title: 'Engineer',
      location: null,
      salary_min: null,
      salary_max: null,
      application_date: '2026-01-01',
      status,
      dashboard_url: null,
      notes: null,
      rejected_at: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
  });
}

const linkVal = (data: ReturnType<typeof computeFlow>, s: string, t: string) =>
  data.links.find((l) => l.source === s && l.target === t)?.value;

const edges = (data: ReturnType<typeof computeFlow>) =>
  data.links.map((l) => `${l.source}->${l.target}`);

describe('computeFlow', () => {
  it('handles an empty list', () => {
    const f = computeFlow([]);
    expect(f.nodes).toEqual([]);
    expect(f.links).toEqual([]);
    expect(f.excludedNA).toBe(0);
    expect(f.total).toBe(0);
  });

  it('cascades reached counts through the funnel', () => {
    const f = computeFlow([
      ...mk('Applied', 3),
      ...mk('Online Assessment', 2),
      ...mk('Interview', 1),
      ...mk('Offer', 2),
      ...mk('Rejected', 4),
      ...mk('Withdrawn', 1),
      ...mk('Ghosted', 2),
      ...mk('N/A', 5),
    ]);
    expect(linkVal(f, 'Applied', 'OA')).toBe(5); // 2 + 1 + 2
    expect(linkVal(f, 'OA', 'Interview')).toBe(3); // 1 + 2
    expect(linkVal(f, 'Interview', 'Offer')).toBe(2);
    expect(linkVal(f, 'Applied', 'Rejected')).toBe(4);
    expect(linkVal(f, 'Applied', 'Withdrawn')).toBe(1);
    expect(linkVal(f, 'Applied', 'Ghosted')).toBe(2);
    expect(f.excludedNA).toBe(5);
    expect(f.total).toBe(20);
  });

  it('drops zero-value links and unused nodes', () => {
    const f = computeFlow([...mk('Applied', 2), ...mk('Rejected', 1)]);
    expect(edges(f)).toEqual(['Applied->Rejected']);
    expect(f.nodes).toEqual(['Applied', 'Rejected']);
  });

  it('builds the whole forward chain from a single Offer', () => {
    const f = computeFlow(mk('Offer', 1));
    expect(edges(f)).toEqual(['Applied->OA', 'OA->Interview', 'Interview->Offer']);
    expect(f.nodes).toEqual(['Applied', 'OA', 'Interview', 'Offer']);
  });

  it('keeps nodes in canonical order regardless of link order', () => {
    const f = computeFlow([...mk('Ghosted', 1), ...mk('Offer', 1)]);
    expect(f.nodes).toEqual(['Applied', 'OA', 'Interview', 'Offer', 'Ghosted']);
  });
});
