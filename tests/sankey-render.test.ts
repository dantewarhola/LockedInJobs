import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SankeyFlow from '../components/SankeyFlow';
import type { SankeyData } from '../lib/flow';

const data: SankeyData = {
  nodes: [
    'Total',
    'Applied',
    'OA',
    'Interview',
    'Offer',
    'Rejected',
    'Withdrawn',
    'Ghosted',
    'Awaiting response',
    'No status',
  ],
  links: [
    { source: 'Total', target: 'Applied', value: 15 },
    { source: 'Total', target: 'Rejected', value: 10 },
    { source: 'Total', target: 'Awaiting response', value: 7 },
    { source: 'Total', target: 'No status', value: 2 },
    { source: 'Applied', target: 'OA', value: 8 },
    { source: 'Applied', target: 'Withdrawn', value: 3 },
    { source: 'Applied', target: 'Ghosted', value: 4 },
    { source: 'OA', target: 'Interview', value: 4 },
    { source: 'Interview', target: 'Offer', value: 2 },
  ],
};

describe('SankeyFlow', () => {
  it('renders an svg with a ribbon per link and a rect per node', () => {
    const html = renderToStaticMarkup(createElement(SankeyFlow, { data }));
    expect(html).toContain('<svg');
    expect((html.match(/<path/g) ?? []).length).toBe(9);
    expect((html.match(/<rect/g) ?? []).length).toBe(10);
    expect(html).toContain('Total (34)');
    expect(html).toContain('Offer (2)');
    expect(html).toContain('Awaiting response (7)');
  });

  it('shows an empty state when there are no links', () => {
    const html = renderToStaticMarkup(
      createElement(SankeyFlow, { data: { nodes: [], links: [] } }),
    );
    expect(html).toContain('Not enough data yet.');
    expect(html).not.toContain('<svg');
  });
});
