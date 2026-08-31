import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SankeyFlow from '../components/SankeyFlow';
import type { SankeyData } from '../lib/flow';

const data: SankeyData = {
  nodes: ['Applied', 'OA', 'Interview', 'Offer', 'Rejected', 'Withdrawn', 'Ghosted'],
  links: [
    { source: 'Applied', target: 'OA', value: 8 },
    { source: 'OA', target: 'Interview', value: 4 },
    { source: 'Interview', target: 'Offer', value: 2 },
    { source: 'Applied', target: 'Rejected', value: 10 },
    { source: 'Applied', target: 'Withdrawn', value: 3 },
    { source: 'Applied', target: 'Ghosted', value: 5 },
  ],
  excludedNA: 2,
  total: 33,
};

describe('SankeyFlow', () => {
  it('renders an svg with a ribbon per link and a rect per node', () => {
    const html = renderToStaticMarkup(createElement(SankeyFlow, { data }));
    expect(html).toContain('<svg');
    expect((html.match(/<path/g) ?? []).length).toBe(6);
    expect((html.match(/<rect/g) ?? []).length).toBe(7);
    expect(html).toContain('Offer (2)');
    expect(html).toContain('2 of 33 excluded');
  });

  it('shows an empty state when there are no links', () => {
    const html = renderToStaticMarkup(
      createElement(SankeyFlow, { data: { nodes: [], links: [], excludedNA: 0, total: 0 } }),
    );
    expect(html).toContain('Not enough data yet.');
    expect(html).not.toContain('<svg');
  });
});
