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
  /** Applications with status 'N/A' — excluded from the flow. */
  excludedNA: number;
  /** Total applications (including excluded). */
  total: number;
}

const NODE_ORDER = ['Applied', 'OA', 'Interview', 'Offer', 'Rejected', 'Withdrawn', 'Ghosted'];

/**
 * Infer an Applied -> OA -> Interview -> Offer funnel (with Rejected / Withdrawn /
 * Ghosted branching off Applied) from the *current* status of each application.
 * Only forward progression and branch flows are drawn; applications still sitting
 * at a stage are not shown as an outgoing flow.
 */
export function computeFlow(apps: Application[]): SankeyData {
  const count = (s: Status) => apps.filter((a) => a.status === s).length;

  const oa = count('Online Assessment');
  const interview = count('Interview');
  const offer = count('Offer');
  const rejected = count('Rejected');
  const withdrawn = count('Withdrawn');
  const ghosted = count('Ghosted');
  const na = count('N/A');

  const reachedOA = oa + interview + offer;
  const reachedInterview = interview + offer;

  const candidates: FlowLink[] = [
    { source: 'Applied', target: 'OA', value: reachedOA },
    { source: 'OA', target: 'Interview', value: reachedInterview },
    { source: 'Interview', target: 'Offer', value: offer },
    { source: 'Applied', target: 'Rejected', value: rejected },
    { source: 'Applied', target: 'Withdrawn', value: withdrawn },
    { source: 'Applied', target: 'Ghosted', value: ghosted },
  ];

  const links = candidates.filter((l) => l.value > 0);

  const used = new Set<string>();
  for (const l of links) {
    used.add(l.source);
    used.add(l.target);
  }
  const nodes = NODE_ORDER.filter((n) => used.has(n));

  return { nodes, links, excludedNA: na, total: apps.length };
}
