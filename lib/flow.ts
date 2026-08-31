import type { Application, Status } from './types';

export interface FlowLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  /** Node names, in draw order. Only nodes touched by a link are included. */
  nodes: string[];
  links: FlowLink[];
}

// Top-to-bottom vertical order within each Sankey column.
const NODE_ORDER = [
  'Total',
  'Awaiting response',
  'Applied',
  'OA',
  'Interview',
  'Offer',
  'Withdrawn',
  'Ghosted',
  'No status',
  'Rejected',
];

/**
 * Build a balanced funnel from the *current* status of each application:
 *
 *   Total ─┬─> Applied ─┬─> OA ──> Interview ──> Offer
 *          │            ├─> Withdrawn
 *          │            └─> Ghosted
 *          ├─> Rejected
 *          ├─> Awaiting response   (still sitting at "Applied")
 *          └─> No status           (status "N/A")
 *
 * Forward stages use "reached" counts — anyone currently at Interview is counted
 * as having passed through OA, etc. Every application is represented exactly once,
 * so the Total node equals the real application count.
 */
export function computeFlow(apps: Application[]): SankeyData {
  const count = (s: Status) => apps.filter((a) => a.status === s).length;

  const stillApplied = count('Applied');
  const oa = count('Online Assessment');
  const interview = count('Interview');
  const offer = count('Offer');
  const rejected = count('Rejected');
  const withdrawn = count('Withdrawn');
  const ghosted = count('Ghosted');
  const noStatus = count('N/A');

  const reachedOA = oa + interview + offer;
  const reachedInterview = interview + offer;
  const enteredPipeline = reachedOA + withdrawn + ghosted;

  const candidates: FlowLink[] = [
    { source: 'Total', target: 'Applied', value: enteredPipeline },
    { source: 'Total', target: 'Rejected', value: rejected },
    { source: 'Total', target: 'Awaiting response', value: stillApplied },
    { source: 'Total', target: 'No status', value: noStatus },
    { source: 'Applied', target: 'OA', value: reachedOA },
    { source: 'Applied', target: 'Withdrawn', value: withdrawn },
    { source: 'Applied', target: 'Ghosted', value: ghosted },
    { source: 'OA', target: 'Interview', value: reachedInterview },
    { source: 'Interview', target: 'Offer', value: offer },
  ];

  const links = candidates.filter((l) => l.value > 0);

  const used = new Set<string>();
  for (const l of links) {
    used.add(l.source);
    used.add(l.target);
  }
  const nodes = NODE_ORDER.filter((n) => used.has(n));

  return { nodes, links };
}
