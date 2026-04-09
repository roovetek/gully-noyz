import type { BallOutcome, MatchRules } from '../lib/types';
import { parseBaseRuns } from '../lib/ballCounter';
import { ExtraType, WicketType, type DeliverBallActionPayload } from './types';

function mapOutcomeToExtraType(outcome: string): ExtraType {
  if (outcome === 'wide') return ExtraType.Wide;
  if (outcome === 'noball') return ExtraType.NoBall;
  if (outcome === 'bye') return ExtraType.Bye;
  if (outcome === 'legbye') return ExtraType.LegBye;
  return ExtraType.None;
}

function mapDismissal(value: string | null | undefined): WicketType | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  const allowed = new Set<string>(Object.values(WicketType));
  return (allowed.has(lower) ? (lower as WicketType) : WicketType.Unknown);
}

export function clipRowToDeliveryPayload(row: {
  outcome: string;
  dismissal_type?: string | null;
  extra_runs?: number | null;
}): DeliverBallActionPayload {
  const outcome = row.outcome.toLowerCase() as BallOutcome;
  const extraType = mapOutcomeToExtraType(outcome);
  const dismissal = mapDismissal(row.dismissal_type);
  return {
    outcome_label: outcome,
    runs_batter: parseBaseRuns(outcome),
    runs_extras: Math.max(0, row.extra_runs ?? 0),
    extra_type: extraType,
    wicket_type: dismissal,
    wicket_counts: dismissal != null || outcome === 'wicket',
  };
}

export function deliveryPayloadToClipInsert(params: {
  matchId: string;
  inningsNumber: number;
  overNumber: number;
  ballNumber: number;
  deliveryIndex: number;
  payload: DeliverBallActionPayload;
  rules: MatchRules;
}): {
  match_id: string;
  innings_number: number;
  over_number: number;
  ball_number: number;
  delivery_index: number;
  outcome: string;
  dismissal_type: string | null;
  extra_runs: number;
  is_valid_ball: boolean;
} {
  const outcome = params.payload.outcome_label.toLowerCase();
  const dismissal = params.payload.wicket_type ?? null;
  const is_valid_ball =
    !(params.payload.extra_type === ExtraType.NoBall) &&
    !(params.payload.extra_type === ExtraType.Wide && params.rules.wide_no_ball_count);

  let extra_runs = Math.max(0, params.payload.runs_extras);
  if (params.payload.extra_type === ExtraType.Wide && params.rules.wide_no_runs) {
    extra_runs = 0;
  }

  return {
    match_id: params.matchId,
    innings_number: params.inningsNumber,
    over_number: params.overNumber,
    ball_number: params.ballNumber,
    delivery_index: params.deliveryIndex,
    outcome,
    dismissal_type: dismissal,
    extra_runs,
    is_valid_ball,
  };
}

