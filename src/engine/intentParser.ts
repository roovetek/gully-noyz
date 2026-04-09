import { ExtraType, WicketType, type DeliverBallActionPayload } from './types';

/**
 * Maps simple STT text into reducer-ready delivery payloads.
 * Keeps parsing deterministic and side-effect free.
 */
export function parseIntentToDeliveryEvent(input: string): DeliverBallActionPayload {
  const text = input.trim().toLowerCase();

  if (text.includes('wide')) {
    return {
      outcome_label: 'wide',
      runs_batter: 0,
      runs_extras: 1,
      extra_type: ExtraType.Wide,
      wicket_type: null,
      wicket_counts: false,
    };
  }

  if (text.includes('no ball') || text.includes('noball')) {
    return {
      outcome_label: 'noball',
      runs_batter: 0,
      runs_extras: 1,
      extra_type: ExtraType.NoBall,
      wicket_type: null,
      wicket_counts: false,
    };
  }

  if (text.includes('wicket') || text.includes('out')) {
    return {
      outcome_label: 'wicket',
      runs_batter: 0,
      runs_extras: 0,
      extra_type: ExtraType.None,
      wicket_type: WicketType.Unknown,
      wicket_counts: true,
    };
  }

  const runMatch = text.match(/\b([0-6])\b/);
  if (runMatch) {
    const runs = Number.parseInt(runMatch[1], 10);
    return {
      outcome_label: String(runs),
      runs_batter: runs,
      runs_extras: 0,
      extra_type: ExtraType.None,
      wicket_type: null,
      wicket_counts: false,
    };
  }

  return {
    outcome_label: 'dot',
    runs_batter: 0,
    runs_extras: 0,
    extra_type: ExtraType.None,
    wicket_type: null,
    wicket_counts: false,
  };
}

