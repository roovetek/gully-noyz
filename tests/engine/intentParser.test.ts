import { describe, expect, it } from 'vitest';
import { ExtraType, WicketType } from '../../src/engine/types';
import { parseIntentToDeliveryEvent } from '../../src/engine/intentParser';

describe('intentParser', () => {
  it('maps wide phrases to wide extras', () => {
    const result = parseIntentToDeliveryEvent('wide ball');
    expect(result).toMatchObject({
      outcome_label: 'wide',
      runs_batter: 0,
      runs_extras: 1,
      extra_type: ExtraType.Wide,
      wicket_type: null,
      wicket_counts: false,
    });
  });

  it('maps no-ball phrases to no-ball extras', () => {
    const resultA = parseIntentToDeliveryEvent('no ball');
    const resultB = parseIntentToDeliveryEvent('noball');

    expect(resultA.extra_type).toBe(ExtraType.NoBall);
    expect(resultA.outcome_label).toBe('noball');
    expect(resultB.extra_type).toBe(ExtraType.NoBall);
  });

  it('maps wicket and out phrases to wicket payload', () => {
    const wicket = parseIntentToDeliveryEvent('wicket');
    const out = parseIntentToDeliveryEvent('batter out');

    expect(wicket).toMatchObject({
      outcome_label: 'wicket',
      extra_type: ExtraType.None,
      wicket_type: WicketType.Unknown,
      wicket_counts: true,
    });
    expect(out.outcome_label).toBe('wicket');
  });

  it('maps numeric run phrases to run payload', () => {
    const six = parseIntentToDeliveryEvent('that is 6 runs');
    const fourWordOnly = parseIntentToDeliveryEvent('four');

    expect(six).toMatchObject({
      outcome_label: '6',
      runs_batter: 6,
      runs_extras: 0,
      extra_type: ExtraType.None,
    });
    // "four" has no numeric token and should fallback to dot.
    expect(fourWordOnly.outcome_label).toBe('dot');
  });

  it('falls back to dot ball for unrecognized phrases', () => {
    const dotBall = parseIntentToDeliveryEvent('dot ball');
    const unknown = parseIntentToDeliveryEvent('random speech');

    expect(dotBall.outcome_label).toBe('dot');
    expect(unknown).toMatchObject({
      outcome_label: 'dot',
      runs_batter: 0,
      runs_extras: 0,
      extra_type: ExtraType.None,
      wicket_type: null,
      wicket_counts: false,
    });
  });
});

