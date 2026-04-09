import { describe, expect, it } from 'vitest';
import { DEFAULT_GLOBAL_RULES } from '../../src/lib/rulesEngine';
import { createInitialMatchState, matchReducer, replayActions } from '../../src/engine/matchEngine';
import { parseIntentToDeliveryEvent } from '../../src/engine/intentParser';
import { ExtraType, WicketType, type MatchAction } from '../../src/engine/types';

describe('matchEngine reducer', () => {
  it('The Over-Flow: six legal balls end over and swap ends', () => {
    let state = createInitialMatchState({
      matchId: 'TEST01',
      rules: { ...DEFAULT_GLOBAL_RULES, balls_per_over: 6 },
      strikerId: 'A',
      nonStrikerId: 'B',
    });

    for (let i = 0; i < 6; i += 1) {
      state = matchReducer(state, {
        type: 'DELIVER_BALL',
        payload: {
          outcome_label: 'dot',
          runs_batter: 0,
          runs_extras: 0,
          extra_type: ExtraType.None,
        },
      });
    }

    expect(state.over_number).toBe(2);
    expect(state.score.legal_balls_in_over).toBe(0);
    expect(state.striker_id).toBe('B');
    expect(state.non_striker_id).toBe('A');
  });

  it('The No-Ball Wicket: caught on no-ball gives run but no wicket', () => {
    const initial = createInitialMatchState({
      matchId: 'TEST02',
      rules: { ...DEFAULT_GLOBAL_RULES },
    });

    const next = matchReducer(initial, {
      type: 'DELIVER_BALL',
      payload: {
        outcome_label: 'noball',
        runs_batter: 0,
        runs_extras: 1,
        extra_type: ExtraType.NoBall,
        wicket_type: WicketType.Caught,
      },
    });

    expect(next.score.runs).toBe(1);
    expect(next.score.wickets).toBe(0);
    expect(next.score.legal_balls_in_over).toBe(0);
  });

  it('The Intent Parser: "wide ball" maps to ExtraEvent', () => {
    const parsed = parseIntentToDeliveryEvent('wide ball');
    expect(parsed.extra_type).toBe(ExtraType.Wide);
    expect(parsed.runs_extras).toBe(1);
    expect(parsed.outcome_label).toBe('wide');
  });

  it('replay produces deterministic state', () => {
    const initial = createInitialMatchState({
      matchId: 'TEST03',
      rules: { ...DEFAULT_GLOBAL_RULES },
      strikerId: 'A',
      nonStrikerId: 'B',
    });
    const actions: MatchAction[] = [
      {
        type: 'DELIVER_BALL',
        payload: {
          outcome_label: '1',
          runs_batter: 1,
          runs_extras: 0,
          extra_type: ExtraType.None,
          created_at: '2026-01-01T00:00:00.000Z',
        },
      },
      {
        type: 'DELIVER_BALL',
        payload: {
          outcome_label: 'wide',
          runs_batter: 0,
          runs_extras: 1,
          extra_type: ExtraType.Wide,
          created_at: '2026-01-01T00:00:01.000Z',
        },
      },
      {
        type: 'DELIVER_BALL',
        payload: {
          outcome_label: '4',
          runs_batter: 4,
          runs_extras: 0,
          extra_type: ExtraType.None,
          created_at: '2026-01-01T00:00:02.000Z',
        },
      },
    ];

    const replayed = replayActions(initial, actions);
    const reduced = actions.reduce((acc, action) => matchReducer(acc, action), initial);

    expect(replayed).toEqual(reduced);
  });
});

