import { executeTrackedAction, supabase } from './supabase';
import { MatchRules, MatchRuleOverride } from './types';
import { userFriendlyMessage } from './userFriendlyError';

/** Defaults match DB migration seed when no row exists or values are null/invalid. */
export const DEFAULT_GLOBAL_RULES: MatchRules = {
  overs_per_innings: 20,
  balls_per_over: 6,
  max_wickets: 10,
  max_overs_per_bowler: 4,
  wide_no_runs: false,
  wide_no_ball_count: false,
  legbye_no_runs: false,
  consecutive_overs_required: false,
};

function coerceGlobalRulesRow(data: Record<string, unknown>): MatchRules {
  const num = (v: unknown, fallback: number) => {
    const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
    return Number.isFinite(n) ? n : fallback;
  };
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

  return {
    overs_per_innings: num(data.overs_per_innings, DEFAULT_GLOBAL_RULES.overs_per_innings),
    balls_per_over: num(data.balls_per_over, DEFAULT_GLOBAL_RULES.balls_per_over),
    max_wickets: num(data.max_wickets, DEFAULT_GLOBAL_RULES.max_wickets),
    max_overs_per_bowler: num(data.max_overs_per_bowler, DEFAULT_GLOBAL_RULES.max_overs_per_bowler),
    wide_no_runs: bool(data.wide_no_runs, DEFAULT_GLOBAL_RULES.wide_no_runs),
    wide_no_ball_count: bool(data.wide_no_ball_count, DEFAULT_GLOBAL_RULES.wide_no_ball_count),
    legbye_no_runs: bool(data.legbye_no_runs, DEFAULT_GLOBAL_RULES.legbye_no_runs),
    consecutive_overs_required: bool(
      data.consecutive_overs_required,
      DEFAULT_GLOBAL_RULES.consecutive_overs_required
    ),
  };
}

export async function getGlobalRules(): Promise<MatchRules | null> {
  const { data, error } = await supabase
    .from('global_rules')
    .select('*')
    .maybeSingle();

  if (error) return null;
  if (!data) return null;

  return coerceGlobalRulesRow(data as Record<string, unknown>);
}

export async function updateGlobalRules(
  rules: Partial<MatchRules>,
  _updatedBy: string,
  adminPasscode: string
): Promise<void> {
  const pass = adminPasscode.trim();
  if (!pass) {
    throw new Error('Admin Console passcode is required to update global rules.');
  }

  const { data, error } = await executeTrackedAction({
    tableName: 'rpc',
    action: 'update_global_rules_as_admin',
    matchId: null,
    payload: { rules },
    execute: () =>
      supabase.rpc('update_global_rules_as_admin', {
        p_passcode: pass,
        p_rules: rules as Record<string, unknown>,
      }),
  });

  if (error) {
    throw new Error(
      userFriendlyMessage(error, { fallback: 'Could not update global rules. Please try again.' })
    );
  }

  const row = data as { ok?: boolean; error?: string } | null;
  if (!row?.ok) {
    throw new Error(
      userFriendlyMessage(row?.error, { fallback: 'Could not update global rules. Please try again.' })
    );
  }
}

export async function getEffectiveRules(matchId: string): Promise<MatchRules | null> {
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('*')
    .eq('match_id', matchId)
    .maybeSingle();

  if (matchError || !match) return null;

  const baseRules: MatchRules = {
    overs_per_innings: match.overs_per_innings,
    balls_per_over: match.balls_per_over,
    max_wickets: match.max_wickets,
    max_overs_per_bowler: match.max_overs_per_bowler,
    wide_no_runs: match.wide_no_runs,
    wide_no_ball_count: match.wide_no_ball_count,
    legbye_no_runs: match.legbye_no_runs,
    consecutive_overs_required: match.consecutive_overs_required,
  };

  const { data: overrides } = await supabase
    .from('match_rule_overrides')
    .select('*')
    .eq('match_id', matchId)
    .is('reverted_at', null)
    .order('applied_at', { ascending: false });

  if (!overrides || overrides.length === 0) return baseRules;

  const effectiveRules = { ...baseRules };

  overrides.forEach((override: MatchRuleOverride) => {
    const key = override.rule_name as keyof MatchRules;
    if (key in effectiveRules) {
      const value = override.override_value;
      if (typeof effectiveRules[key] === 'number') {
        (effectiveRules as any)[key] = parseInt(value, 10);
      } else if (typeof effectiveRules[key] === 'boolean') {
        (effectiveRules as any)[key] = value === 'true';
      }
    }
  });

  return effectiveRules;
}

export async function applyOverride(
  matchId: string,
  ruleName: keyof MatchRules,
  newValue: string | number | boolean,
  reason: string,
  role: 'umpire'
): Promise<void> {
  const currentRules = await getEffectiveRules(matchId);
  if (!currentRules) throw new Error('Match not found');

  const originalValue = String(currentRules[ruleName]);
  const overrideValue = String(newValue);

  const { error } = await executeTrackedAction({
    tableName: 'match_rule_overrides',
    action: 'insert',
    matchId,
    payload: { rule_name: ruleName, reason, applied_by_role: role },
    execute: () =>
      supabase.from('match_rule_overrides').insert({
        match_id: matchId,
        rule_name: ruleName,
        original_value: originalValue,
        override_value: overrideValue,
        reason,
        applied_by_role: role,
      }),
  });

  if (error) {
    throw new Error(
      userFriendlyMessage(error, { fallback: 'Could not apply rule override. Please try again.' })
    );
  }
}

export async function revertOverride(overrideId: string, role: 'umpire'): Promise<void> {
  const { error } = await executeTrackedAction({
    tableName: 'match_rule_overrides',
    action: 'revert',
    matchId: null,
    payload: { override_id: overrideId, reverted_by_role: role },
    execute: () =>
      supabase
        .from('match_rule_overrides')
        .update({
          reverted_at: new Date().toISOString(),
          reverted_by_role: role,
        })
        .eq('id', overrideId),
  });

  if (error) {
    throw new Error(
      userFriendlyMessage(error, { fallback: 'Could not revert rule override. Please try again.' })
    );
  }
}

export async function getActiveOverrides(matchId: string): Promise<MatchRuleOverride[]> {
  const { data, error } = await supabase
    .from('match_rule_overrides')
    .select('*')
    .eq('match_id', matchId)
    .is('reverted_at', null)
    .order('applied_at', { ascending: false });

  if (error) return [];
  return data || [];
}
