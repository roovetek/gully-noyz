export interface MatchRules {
  overs_per_innings: number;
  balls_per_over: number;
  max_wickets: number;
  max_overs_per_bowler: number;
  wide_no_runs: boolean;
  wide_no_ball_count: boolean;
  legbye_no_runs: boolean;
  consecutive_overs_required: boolean;
}

export interface GlobalRules extends MatchRules {
  id: string;
  updated_at: string;
  updated_by: string | null;
}

export interface Match extends MatchRules {
  match_id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
  id: string | null;
  secret_hash: string | null;
  is_public: boolean;
  total_overs: number;
  current_innings: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  result_type: 'winner' | 'tie' | 'abandoned' | 'no_result' | null;
  winner: string | null;
}

/** Match-side roles (passcode in access_roles). Umpire = match authority; no separate "match admin". */
export type MatchAccessRole = 'umpire' | 'scorer' | 'captain';

export type UserRole = MatchAccessRole | null;

export interface MatchRuleOverride {
  id: string;
  match_id: string;
  rule_name: string;
  original_value: string;
  override_value: string;
  reason: string;
  applied_at: string;
  applied_by_role: 'umpire';
  reverted_at: string | null;
  reverted_by_role: 'umpire' | null;
}

export interface AccessRole {
  id: string;
  match_id: string;
  role: MatchAccessRole;
  passcode_hash: string;
  created_at: string;
}

export interface MatchResult {
  id: string;
  match_id: string;
  status: 'completed' | 'abandoned' | 'tie';
  winner: string | null;
  completion_reason: string;
  completed_at: string;
  completed_by_role: 'umpire';
}

export interface Clip {
  id: string;
  match_id: string;
  innings: number;
  outcome: BallOutcome;
  runs: number;
  wicket: boolean;
  created_at: string;
  bowler_name: string | null;
  extra_runs: number;
  is_valid_ball: boolean;
  over_number: number;
  ball_in_over: number;
  input_method?: 'manual' | 'voice';
}

export type BallOutcome =
  | '0'
  | 'dot'
  | '1'
  | '2'
  | '3'
  | '4'
  | '6'
  | 'wicket'
  | 'other'
  | 'wide'
  | 'noball'
  | 'bye'
  | 'legbye'
  | 'out_caught'
  | 'out_bowled'
  | 'out_lbw'
  | 'out_runout'
  | 'out_stumped'
  | 'out_hitwicket';

export interface BowlerStats {
  name: string;
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
  economy: number;
}
