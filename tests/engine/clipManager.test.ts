import { describe, expect, it } from 'vitest';
import { calculateClipWindow, getHighlightReel } from '../../src/engine/clipManager';
import { ExtraType, WicketType, type Ball } from '../../src/engine/types';

function makeBall(partial: Partial<Ball>): Ball {
  return {
    match_id: 'M123',
    innings_number: 1,
    over_number: 1,
    ball_number: 1,
    delivery_index: 1,
    striker_id: null,
    non_striker_id: null,
    bowler_id: null,
    outcome_label: 'dot',
    runs_batter: 0,
    runs_extras: 0,
    extra_type: ExtraType.None,
    wicket_type: null,
    wicket_counts: false,
    is_legal_delivery: true,
    created_at: new Date().toISOString(),
    metadata: {
      hit_timestamp_ms: null,
      video_clip_id: null,
      voice_intent_confidence: 0.8,
      is_highlight: false,
      transcript: null,
    },
    ...partial,
  };
}

describe('clipManager', () => {
  it('calculates trim window from ball start', () => {
    const window = calculateClipWindow({
      ball_start_time_ms: 1000,
      clip_start_time_ms: 1300,
      clip_end_time_ms: 2600,
    });
    expect(window).toEqual({ trim_start_ms: 300, trim_end_ms: 1600 });
  });

  it('builds highlight reel from high-impact events', () => {
    const ledger = [
      makeBall({ outcome_label: 'dot' }),
      makeBall({ outcome_label: '4', runs_batter: 4, delivery_index: 2 }),
      makeBall({
        outcome_label: 'wicket',
        wicket_counts: true,
        wicket_type: WicketType.Bowled,
        delivery_index: 3,
      }),
      makeBall({
        outcome_label: 'other',
        delivery_index: 4,
        metadata: {
          hit_timestamp_ms: null,
          video_clip_id: null,
          voice_intent_confidence: 0.3,
          is_highlight: false,
          transcript: 'close call at stumps',
        },
      }),
    ];

    const reel = getHighlightReel('M123', ledger);
    expect(reel).toHaveLength(3);
    expect(reel.map((b) => b.delivery_index)).toEqual([2, 3, 4]);
  });
});

