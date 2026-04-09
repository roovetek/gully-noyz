import type { MatchRules } from '../lib/types';

export enum WicketType {
  Bowled = 'bowled',
  Caught = 'caught',
  Lbw = 'lbw',
  RunOut = 'runout',
  Stumped = 'stumped',
  HitWicket = 'hitwicket',
  HitBallTwice = 'hitballtwice',
  Obstructing = 'obstructing',
  TimedOut = 'timedout',
  HandledBall = 'handledball',
  Unknown = 'unknown',
}

export enum ExtraType {
  None = 'none',
  Wide = 'wide',
  NoBall = 'noball',
  Bye = 'bye',
  LegBye = 'legbye',
}

export enum MatchStatus {
  NotStarted = 'not_started',
  InProgress = 'in_progress',
  InningsBreak = 'innings_break',
  Completed = 'completed',
  Abandoned = 'abandoned',
}

export interface AIBallMetadata {
  hit_timestamp_ms: number | null;
  video_clip_id: string | null;
  voice_intent_confidence: number | null;
  is_highlight: boolean;
  transcript: string | null;
}

/**
 * Cricsheet-inspired delivery record with app-specific metadata.
 * - `runs_batter` + `runs_extras` are stored separately for deterministic rules replay.
 * - `is_legal_delivery` captures over progression behavior directly.
 */
export interface Ball {
  match_id: string;
  innings_number: number;
  over_number: number;
  ball_number: number;
  delivery_index: number;
  striker_id: string | null;
  non_striker_id: string | null;
  bowler_id: string | null;
  outcome_label: string;
  runs_batter: number;
  runs_extras: number;
  extra_type: ExtraType;
  wicket_type: WicketType | null;
  wicket_counts: boolean;
  is_legal_delivery: boolean;
  created_at: string;
  metadata: AIBallMetadata;
}

export interface ScoreState {
  runs: number;
  wickets: number;
  legal_balls_in_over: number;
}

export interface MatchState {
  match_id: string;
  innings_number: number;
  over_number: number;
  delivery_index: number;
  balls_per_over: number;
  status: MatchStatus;
  striker_id: string | null;
  non_striker_id: string | null;
  score: ScoreState;
  history: Ball[];
  pending_sync: boolean;
  rules: MatchRules;
}

export interface ManualCorrectionPayload {
  runs?: number;
  wickets?: number;
  striker_id?: string | null;
  non_striker_id?: string | null;
  over_number?: number;
  legal_balls_in_over?: number;
  reason: string;
}

export interface DeliverBallActionPayload {
  outcome_label: string;
  runs_batter: number;
  runs_extras: number;
  extra_type: ExtraType;
  wicket_type?: WicketType | null;
  wicket_counts?: boolean;
  striker_id?: string | null;
  non_striker_id?: string | null;
  bowler_id?: string | null;
  metadata?: Partial<AIBallMetadata>;
  created_at?: string;
}

export type MatchAction =
  | { type: 'DELIVER_BALL'; payload: DeliverBallActionPayload }
  | { type: 'MANUAL_CORRECTION'; payload: ManualCorrectionPayload }
  | { type: 'SET_PENDING_SYNC'; payload: { pending_sync: boolean } }
  | { type: 'LOAD_SNAPSHOT'; payload: { state: MatchState } };

