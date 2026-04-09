import { describe, expect, it } from 'vitest';
import { calculateInningsOversDisplay, calculateMatchStats } from '../../src/lib/match';

describe('match helpers with extras', () => {
  it('counts only valid balls for innings over display', () => {
    const clips = [
      { is_valid_ball: true },
      { is_valid_ball: true },
      { is_valid_ball: false }, // wide
      { is_valid_ball: true },
      { is_valid_ball: false }, // no-ball
      { is_valid_ball: true },
      { is_valid_ball: true },
      { is_valid_ball: true },
    ];

    expect(calculateInningsOversDisplay(clips, 6)).toBe('1');
  });

  it('shows partial over after valid balls exceed one over', () => {
    const clips = [
      { is_valid_ball: true },
      { is_valid_ball: true },
      { is_valid_ball: true },
      { is_valid_ball: true },
      { is_valid_ball: true },
      { is_valid_ball: true },
      { is_valid_ball: false },
      { is_valid_ball: true },
    ];

    expect(calculateInningsOversDisplay(clips, 6)).toBe('1.1');
  });

  it('includes extra_runs for totals and wickets', () => {
    const clips = [
      { outcome: '1', extra_runs: 0, is_valid_ball: true },
      { outcome: 'wide', extra_runs: 1, is_valid_ball: false },
      { outcome: 'noball', extra_runs: 2, is_valid_ball: false },
      { outcome: 'wicket', dismissal_type: 'bowled', extra_runs: 0, is_valid_ball: true },
    ];

    const stats = calculateMatchStats(clips, 6);
    expect(stats.totalRuns).toBe(4);
    expect(stats.totalWickets).toBe(1);
    expect(stats.currentOvers).toBe('0.2');
  });
});
