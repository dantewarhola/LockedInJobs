'use client';

import { useMemo, useState } from 'react';
import {
  sankey,
  sankeyLeft,
  sankeyLinkHorizontal,
  type SankeyLink,
  type SankeyNode,
} from 'd3-sankey';
import type { SankeyData } from '@/lib/flow';

interface NodeExtra {
  name: string;
}
interface LinkExtra {
  source: string;
  target: string;
  value: number;
}
type SNode = SankeyNode<NodeExtra, LinkExtra>;
type SLink = SankeyLink<NodeExtra, LinkExtra>;

const WIDTH = 760;
const HEIGHT = 300;
const MARGIN = { top: 12, right: 132, bottom: 12, left: 78 };

const NODE_COLOR: Record<string, string> = {
  Total: '#334155',
  Applied: '#2563eb',
  OA: '#4f46e5',
  Interview: '#d97706',
  Offer: '#16a34a',
  Rejected: '#dc2626',
  Withdrawn: '#6b7280',
  Ghosted: '#9ca3af',
  'Awaiting response': '#93c5fd',
  'No status': '#d1d5db',
};
const colorOf = (name: string) => NODE_COLOR[name] ?? '#94a3b8';

export default function SankeyFlow({ data }: { data: SankeyData }) {
  const [hover, setHover] = useState<string | null>(null);

  const graph = useMemo(() => {
    if (data.links.length === 0) return null;
    const layout = sankey<NodeExtra, LinkExtra>()
      .nodeId((d) => d.name)
      .nodeAlign(sankeyLeft)
      .nodeWidth(14)
      .nodePadding(18)
      .extent([
        [MARGIN.left, MARGIN.top],
        [WIDTH - MARGIN.right, HEIGHT - MARGIN.bottom],
      ]);

    return layout({
      nodes: data.nodes.map((name) => ({ name })),
      links: data.links.map((l) => ({ ...l })),
    });
  }, [data]);

  if (!graph) {
    return <p className="text-sm text-gray-400">Not enough data yet.</p>;
  }

  const nodes = graph.nodes as SNode[];
  const links = graph.links as SLink[];
  const linkPath = sankeyLinkHorizontal<NodeExtra, LinkExtra>();

  const nodeName = (n: number | string | SNode) =>
    typeof n === 'object' ? n.name : String(n);

  const isLinkActive = (l: SLink) =>
    hover === null || nodeName(l.source) === hover || nodeName(l.target) === hover;
  const isNodeActive = (n: SNode) =>
    hover === null ||
    n.name === hover ||
    links.some(
      (l) =>
        (nodeName(l.source) === hover && nodeName(l.target) === n.name) ||
        (nodeName(l.target) === hover && nodeName(l.source) === n.name),
    );

  return (
    <figure className="space-y-2">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-auto w-full"
        role="img"
        aria-label="Application flow diagram: Total applications split into Applied, Rejected, still-awaiting and no-status; Applied then flows through OA, Interview and Offer, with Withdrawn and Ghosted branching off"
      >
        <g fill="none">
          {links.map((l, i) => (
            <path
              key={i}
              d={linkPath(l) ?? undefined}
              stroke={colorOf(nodeName(l.target))}
              strokeOpacity={isLinkActive(l) ? 0.4 : 0.08}
              strokeWidth={Math.max(1, l.width ?? 1)}
            />
          ))}
        </g>
        <g>
          {nodes.map((n) => {
            const active = isNodeActive(n);
            const isSource = n.depth === 0;
            const x = isSource ? (n.x0 ?? 0) - 8 : (n.x1 ?? 0) + 8;
            const anchor = isSource ? 'end' : 'start';
            return (
              <g
                key={n.name}
                onMouseEnter={() => setHover(n.name)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: 'default' }}
              >
                <rect
                  x={n.x0}
                  y={n.y0}
                  width={(n.x1 ?? 0) - (n.x0 ?? 0)}
                  height={Math.max(1, (n.y1 ?? 0) - (n.y0 ?? 0))}
                  fill={colorOf(n.name)}
                  fillOpacity={active ? 1 : 0.25}
                  rx={2}
                />
                <text
                  x={x}
                  y={((n.y0 ?? 0) + (n.y1 ?? 0)) / 2}
                  dy="0.35em"
                  textAnchor={anchor}
                  fontSize={12}
                  fill={active ? '#111827' : '#9ca3af'}
                  stroke="#ffffff"
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {n.name} ({Math.round(n.value ?? 0)})
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <figcaption className="text-xs text-gray-400">
        Inferred from current status, not tracked transitions. &quot;Awaiting response&quot; is
        still at Applied; &quot;No status&quot; is status N/A.
      </figcaption>
    </figure>
  );
}
