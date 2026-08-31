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
  });

  it('splits Total into Applied / Rejected / Awaiting / No status and cascades the pipeline', () => {
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

    // Total splits
    expect(linkVal(f, 'Total', 'Rejected')).toBe(4);
    expect(linkVal(f, 'Total', 'Awaiting response')).toBe(3);
    expect(linkVal(f, 'Total', 'No status')).toBe(5);
    // reachedOA (5) + withdrawn (1) + ghosted (2) = 8
    expect(linkVal(f, 'Total', 'Applied')).toBe(8);

    // Applied splits
    expect(linkVal(f, 'Applied', 'OA')).toBe(5); // 2 + 1 + 2
    expect(linkVal(f, 'Applied', 'Withdrawn')).toBe(1);
    expect(linkVal(f, 'Applied', 'Ghosted')).toBe(2);

    // forward chain
    expect(linkVal(f, 'OA', 'Interview')).toBe(3); // 1 + 2
    expect(linkVal(f, 'Interview', 'Offer')).toBe(2);
  });

  it('keeps the Total node balanced (outflow equals application count)', () => {
    const apps = [
      ...mk('Applied', 3),
      ...mk('Online Assessment', 2),
      ...mk('Interview', 1),
      ...mk('Offer', 2),
      ...mk('Rejected', 4),
      ...mk('Withdrawn', 1),
      ...mk('Ghosted', 2),
      ...mk('N/A', 5),
    ];
    const f = computeFlow(apps);
    const totalOut = f.links
      .filter((l) => l.source === 'Total')
      .reduce((s, l) => s + l.value, 0);
    expect(totalOut).toBe(apps.length);
  });

  it('drops zero-value links and unused nodes', () => {
    const f = computeFlow([...mk('Applied', 2), ...mk('Rejected', 1)]);
    expect(edges(f)).toEqual(['Total->Rejected', 'Total->Awaiting response']);
    expect(f.nodes).toEqual(['Total', 'Rejected', 'Awaiting response']);
  });

  it('builds the whole forward chain from a single Offer', () => {
    const f = computeFlow(mk('Offer', 1));
    expect(edges(f)).toEqual([
      'Total->Applied',
      'Applied->OA',
      'OA->Interview',
      'Interview->Offer',
    ]);
    expect(f.nodes).toEqual(['Total', 'Applied', 'OA', 'Interview', 'Offer']);
  });

  it('keeps nodes in canonical order regardless of link order', () => {
    const f = computeFlow([...mk('Ghosted', 1), ...mk('Offer', 1), ...mk('N/A', 1)]);
    expect(f.nodes).toEqual([
      'Total',
      'Applied',
      'OA',
      'Interview',
      'Offer',
      'Ghosted',
      'No status',
    ]);
  });
});
