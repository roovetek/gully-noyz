import { produce } from 'immer';
import type { MatchRules } from '../lib/types';
import {
  ExtraType,
  MatchStatus,
  WicketType,
  type AIBallMetadata,
  type Ball,
  type DeliverBallActionPayload,
  type MatchAction,
  type MatchState,
} from './types';

const DEFAULT_AI_METADATA: AIBallMetadata = {
  hit_timestamp_ms: null,
  video_clip_id: null,
  voice_intent_confidence: null,
  is_highlight: false,
  transcript: null,
};

function isLegalDelivery(extraType: ExtraType, rules: MatchRules): boolean {
  if (extraType === ExtraType.Wide) {
    return !rules.wide_no_ball_count;
  }
  if (extraType === ExtraType.NoBall) {
    return false;
  }
  return true;
}

/**
 * ICC rule edge-case handling:
 * - Wide scoring can be configured to 0 via `wide_no_runs`.
 * - No-ball is always an illegal delivery for over progression.
 * - Caught on no-ball does not count as wicket (unless umpire override forces it).
 */
function normalizePayload(payload: DeliverBallActionPayload, rules: MatchRules): DeliverBallActionPayload {
  const normalized: DeliverBallActionPayload = {
    ...payload,
    runs_batter: Math.max(0, payload.runs_batter),
    runs_extras: Math.max(0, payload.runs_extras),
    wicket_type: payload.wicket_type ?? null,
    wicket_counts: payload.wicket_counts ?? payload.wicket_type != null,
  };

  if (normalized.extra_type === ExtraType.Wide && rules.wide_no_runs) {
    normalized.runs_extras = 0;
  }

  if (normalized.extra_type === ExtraType.NoBall && normalized.wicket_type === WicketType.Caught) {
    normalized.wicket_counts = false;
  }

  return normalized;
}

function shouldSwapStrikeByRuns(payload: DeliverBallActionPayload): boolean {
  const totalRuns = payload.runs_batter + payload.runs_extras;
  // Boundaries retain striker unless over ends.
  if (payload.runs_batter === 4 || payload.runs_batter === 6) {
    return false;
  }
  return totalRuns % 2 === 1;
}

function swapStrike(draft: MatchState): void {
  const temp = draft.striker_id;
  draft.striker_id = draft.non_striker_id;
  draft.non_striker_id = temp;
}

function buildBall(draft: MatchState, payload: DeliverBallActionPayload): Ball {
  const legal = isLegalDelivery(payload.extra_type, draft.rules);
  const final = normalizePayload(payload, draft.rules);
  return {
    match_id: draft.match_id,
    innings_number: draft.innings_number,
    over_number: draft.over_number,
    ball_number: draft.score.legal_balls_in_over + 1,
    delivery_index: draft.delivery_index,
    striker_id: final.striker_id ?? draft.striker_id,
    non_striker_id: final.non_striker_id ?? draft.non_striker_id,
    bowler_id: final.bowler_id ?? null,
    outcome_label: final.outcome_label,
    runs_batter: final.runs_batter,
    runs_extras: final.runs_extras,
    extra_type: final.extra_type,
    wicket_type: final.wicket_type ?? null,
    wicket_counts: Boolean(final.wicket_counts),
    is_legal_delivery: legal,
    created_at: final.created_at ?? new Date().toISOString(),
    metadata: { ...DEFAULT_AI_METADATA, ...(final.metadata ?? {}) },
  };
}

export function createInitialMatchState(params: {
  matchId: string;
  rules: MatchRules;
  strikerId?: string | null;
  nonStrikerId?: string | null;
}): MatchState {
  return {
    match_id: params.matchId,
    innings_number: 1,
    over_number: 1,
    delivery_index: 1,
    balls_per_over: params.rules.balls_per_over,
    status: MatchStatus.InProgress,
    striker_id: params.strikerId ?? null,
    non_striker_id: params.nonStrikerId ?? null,
    score: {
      runs: 0,
      wickets: 0,
      legal_balls_in_over: 0,
    },
    history: [],
    pending_sync: false,
    rules: params.rules,
  };
}

export function matchReducer(state: MatchState, action: MatchAction): MatchState {
  return produce(state, (draft) => {
    switch (action.type) {
      case 'DELIVER_BALL': {
        const ball = buildBall(draft, action.payload);
        draft.history.push(ball);
        draft.pending_sync = true;
        draft.delivery_index += 1;
        draft.score.runs += ball.runs_batter + ball.runs_extras;
        if (ball.wicket_counts && ball.wicket_type) {
          draft.score.wickets += 1;
        }

        const shouldSwap = shouldSwapStrikeByRuns(ball);
        if (shouldSwap) {
          swapStrike(draft);
        }

        if (ball.is_legal_delivery) {
          draft.score.legal_balls_in_over += 1;
          if (draft.score.legal_balls_in_over >= draft.balls_per_over) {
            draft.over_number += 1;
            draft.score.legal_balls_in_over = 0;
            // End-of-over strike swap.
            swapStrike(draft);
          }
        }
        return;
      }

      case 'MANUAL_CORRECTION': {
        const p = action.payload;
        if (typeof p.runs === 'number') draft.score.runs = Math.max(0, p.runs);
        if (typeof p.wickets === 'number') draft.score.wickets = Math.max(0, p.wickets);
        if (typeof p.over_number === 'number') draft.over_number = Math.max(1, p.over_number);
        if (typeof p.legal_balls_in_over === 'number') {
          draft.score.legal_balls_in_over = Math.max(
            0,
            Math.min(draft.balls_per_over - 1, p.legal_balls_in_over)
          );
        }
        if (p.striker_id !== undefined) draft.striker_id = p.striker_id;
        if (p.non_striker_id !== undefined) draft.non_striker_id = p.non_striker_id;
        draft.pending_sync = true;
        return;
      }

      case 'SET_PENDING_SYNC':
        draft.pending_sync = action.payload.pending_sync;
        return;

      case 'LOAD_SNAPSHOT':
        return action.payload.state;
    }
  });
}

export function replayActions(initialState: MatchState, actions: MatchAction[]): MatchState {
  return actions.reduce((acc, action) => matchReducer(acc, action), initialState);
}

