import { describe, expect, it } from 'vitest';
import { DEFAULT_GLOBAL_RULES } from '../../src/lib/rulesEngine';
import { createParityReport } from '../../src/engine/parity';

describe('engine parity', () => {
  it('matches legacy runs/wickets/overs on representative clips', () => {
    const rules = { ...DEFAULT_GLOBAL_RULES, wide_no_runs: false, wide_no_ball_count: true };
    const clips = [
      { outcome: '1', extra_runs: 0, dismissal_type: null, is_valid_ball: true },
      { outcome: 'wide', extra_runs: 1, dismissal_type: null, is_valid_ball: false },
      { outcome: '4', extra_runs: 0, dismissal_type: null, is_valid_ball: true },
      { outcome: 'wicket', extra_runs: 0, dismissal_type: 'bowled', is_valid_ball: true },
    ];

    const report = createParityReport('PAR01', rules, clips);
    expect(report.matches).toBe(true);
  });
});

