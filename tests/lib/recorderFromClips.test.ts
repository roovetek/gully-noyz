import { describe, expect, it } from 'vitest';
import { deriveRecorderHudFromInningsClips } from '../../src/lib/recorderFromClips';

describe('deriveRecorderHudFromInningsClips', () => {
  it('returns defaults for empty innings', () => {
    const hud = deriveRecorderHudFromInningsClips([], 6, 20);
    expect(hud.overNumber).toBe(1);
    expect(hud.ballNumber).toBe(1);
    expect(hud.currentOvers).toBe('0');
    expect(hud.usedDeliveries.size).toBe(0);
  });

  it('advances to next ball after one valid delivery in over 1', () => {
    const hud = deriveRecorderHudFromInningsClips(
      [
        {
          outcome: 'dot',
          dismissal_type: null,
          over_number: 1,
          ball_number: 1,
          delivery_index: 1,
          innings_number: 1,
          extra_runs: 0,
          is_valid_ball: true,
        },
      ],
      6,
      20
    );
    expect(hud.overNumber).toBe(1);
    expect(hud.ballNumber).toBe(2);
    expect(hud.deliveryNumber).toBe(2);
    expect(hud.currentOvers).toBe('0.1');
    expect(hud.usedDeliveries.has(1)).toBe(true);
  });
});
