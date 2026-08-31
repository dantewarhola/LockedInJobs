import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import StreakCard from '../components/StreakCard';

describe('StreakCard', () => {
  it('shows the current streak and best streak', () => {
    const html = renderToStaticMarkup(createElement(StreakCard, { current: 3, longest: 5 }));
    expect(html).toContain('3 days');
    expect(html).toContain('Best: 5 days');
  });

  it('uses the singular "day" for a streak of one', () => {
    const html = renderToStaticMarkup(createElement(StreakCard, { current: 1, longest: 1 }));
    expect(html).toContain('1 day');
    expect(html).toContain('Best: 1 day');
  });

  it('prompts to start when the streak is zero', () => {
    const html = renderToStaticMarkup(createElement(StreakCard, { current: 0, longest: 4 }));
    expect(html).toContain('Add an application to start a streak');
  });
});
