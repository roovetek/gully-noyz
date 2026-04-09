import { describe, expect, it } from 'vitest';
import { DEFAULT_GLOBAL_RULES } from '../../src/lib/rulesEngine';
import { clipRowToDeliveryPayload, deliveryPayloadToClipInsert } from '../../src/engine/adapters';
import { ExtraType, WicketType } from '../../src/engine/types';

describe('engine adapters', () => {
  it('maps clip row to delivery payload', () => {
    const payload = clipRowToDeliveryPayload({
      outcome: 'NOBALL',
      dismissal_type: 'caught',
      extra_runs: 1,
    });

    expect(payload.outcome_label).toBe('noball');
    expect(payload.extra_type).toBe(ExtraType.NoBall);
    expect(payload.wicket_type).toBe(WicketType.Caught);
    expect(payload.runs_extras).toBe(1);
  });

  it('applies wide rule config when building clip insert', () => {
    const insert = deliveryPayloadToClipInsert({
      matchId: 'M1',
      inningsNumber: 1,
      overNumber: 1,
      ballNumber: 1,
      deliveryIndex: 2,
      payload: {
        outcome_label: 'wide',
        runs_batter: 0,
        runs_extras: 2,
        extra_type: ExtraType.Wide,
      },
      rules: {
        ...DEFAULT_GLOBAL_RULES,
        wide_no_runs: true,
        wide_no_ball_count: true,
      },
    });

    expect(insert.extra_runs).toBe(0);
    expect(insert.is_valid_ball).toBe(false);
    expect(insert.outcome).toBe('wide');
  });

  it('marks no-ball as invalid and preserves extras', () => {
    const insert = deliveryPayloadToClipInsert({
      matchId: 'M2',
      inningsNumber: 1,
      overNumber: 3,
      ballNumber: 4,
      deliveryIndex: 5,
      payload: {
        outcome_label: 'noball',
        runs_batter: 1,
        runs_extras: 1,
        extra_type: ExtraType.NoBall,
        wicket_type: WicketType.Caught,
      },
      rules: { ...DEFAULT_GLOBAL_RULES },
    });

    expect(insert.is_valid_ball).toBe(false);
    expect(insert.extra_runs).toBe(1);
    expect(insert.dismissal_type).toBe('caught');
  });
});

