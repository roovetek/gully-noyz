import { calculateMatchStats } from '../lib/match';
import type { MatchRules } from '../lib/types';
import { clipRowToDeliveryPayload } from './adapters';
import { createInitialMatchState, matchReducer } from './matchEngine';
import { MatchStatus, type MatchState } from './types';

type ClipRow = {
  outcome: string;
  extra_runs?: number | null;
  dismissal_type?: string | null;
  is_valid_ball?: boolean;
};

export interface ParityReport {
  oldStats: {
    runs: number;
    wickets: number;
    overs: string;
  };
  engineStats: {
    runs: number;
    wickets: number;
    overs: string;
  };
  matches: boolean;
}

export function buildEngineStateFromClipRows(
  matchId: string,
  rules: MatchRules,
  clips: ClipRow[]
): MatchState {
  let state = createInitialMatchState({ matchId, rules });
  for (const clip of clips) {
    const payload = clipRowToDeliveryPayload(clip);
    state = matchReducer(state, { type: 'DELIVER_BALL', payload });
  }
  return state;
}

export function createParityReport(matchId: string, rules: MatchRules, clips: ClipRow[]): ParityReport {
  const old = calculateMatchStats(
    clips.map((clip) => ({
      ...clip,
      extra_runs: clip.extra_runs ?? undefined,
    })),
    rules.balls_per_over
  );
  const engine = buildEngineStateFromClipRows(matchId, rules, clips);
  const overs = `${Math.floor(engine.history.filter((b) => b.is_legal_delivery).length / rules.balls_per_over)}.${engine.score.legal_balls_in_over}`;
  const oldOvers = old.currentOvers.includes('.') ? old.currentOvers : `${old.currentOvers}.0`;
  const engineOvers = overs.endsWith('.0') && !old.currentOvers.includes('.') ? overs.slice(0, -2) : overs;

  return {
    oldStats: {
      runs: old.totalRuns,
      wickets: old.totalWickets,
      overs: old.currentOvers,
    },
    engineStats: {
      runs: engine.score.runs,
      wickets: engine.score.wickets,
      overs: engineOvers,
    },
    matches:
      old.totalRuns === engine.score.runs &&
      old.totalWickets === engine.score.wickets &&
      (old.currentOvers === engineOvers || oldOvers === overs),
  };
}

export function markSnapshotSynced(state: MatchState): MatchState {
  return {
    ...state,
    pending_sync: false,
    status: state.status === MatchStatus.InProgress ? MatchStatus.InProgress : state.status,
  };
}

