import { describe, expect, it } from 'vitest';
import {
  DISMISSAL_TYPES,
  formatDismissalOptionLabel,
  getDismissalOptionOrder,
  getFallbackDismissalOptions,
} from '../../src/lib/dismissalOptions';

describe('dismissalOptions', () => {
  it('returns canonical ordering with primary block first and unknown last', () => {
    const order = getDismissalOptionOrder();

    expect(order.slice(0, 5)).toEqual(['bowled', 'caught', 'lbw', 'runout', 'stumped']);
    expect(order[order.length - 1]).toBe('unknown');
    expect(order).toHaveLength(DISMISSAL_TYPES.length);
    expect(new Set(order).size).toBe(order.length);
  });

  it('formats known and unknown dismissal labels', () => {
    expect(formatDismissalOptionLabel('bowled')).toBe('Bowled');
    expect(formatDismissalOptionLabel('lbw')).toBe('Leg Before Wicket (LBW)');
    expect(formatDismissalOptionLabel('unknown')).toBe('Other');
    expect(formatDismissalOptionLabel('rarecase')).toBe('Rarecase');
  });

  it('builds fallback options from canonical order and labels', () => {
    const options = getFallbackDismissalOptions();

    expect(options).toHaveLength(DISMISSAL_TYPES.length);
    expect(options[0]).toEqual({ value: 'bowled', label: 'Bowled' });
    expect(options[options.length - 1]).toEqual({ value: 'unknown', label: 'Other' });
  });
});

