import { supabase } from './supabase';
import { MatchRules, MatchRuleOverride } from './types';

export async function getGlobalRules(): Promise<MatchRules | null> {
  const { data, error } = await supabase
    .from('global_rules')
    .select('*')
    .maybeSingle();

  if (error || !data) return null;

  return {
    overs_per_innings: data.overs_per_innings,
    balls_per_over: data.balls_per_over,
    max_wickets: data.max_wickets,
    max_overs_per_bowler: data.max_overs_per_bowler,
    wide_no_runs: data.wide_no_runs,
    wide_no_ball_count: data.wide_no_ball_count,
    legbye_no_runs: data.legbye_no_runs,
    consecutive_overs_required: data.consecutive_overs_required,
  };
}

export async function updateGlobalRules(rules: Partial<MatchRules>, updatedBy: string): Promise<void> {
  const { data: existing } = await supabase
    .from('global_rules')
    .select('id')
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('global_rules')
      .update({ ...rules, updated_by: updatedBy, updated_at: new Date().toISOString() })
      .eq('id', existing.id);

    if (error) throw new Error(`Failed to update global rules: ${error.message}`);
  } else {
    const { error } = await supabase
      .from('global_rules')
      .insert({ ...rules, updated_by: updatedBy });

    if (error) throw new Error(`Failed to create global rules: ${error.message}`);
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

  const { error } = await supabase
    .from('match_rule_overrides')
    .insert({
      match_id: matchId,
      rule_name: ruleName,
      original_value: originalValue,
      override_value: overrideValue,
      reason,
      applied_by_role: role,
    });

  if (error) throw new Error(`Failed to apply override: ${error.message}`);
}

export async function revertOverride(overrideId: string, role: 'umpire'): Promise<void> {
  const { error } = await supabase
    .from('match_rule_overrides')
    .update({
      reverted_at: new Date().toISOString(),
      reverted_by_role: role,
    })
    .eq('id', overrideId);

  if (error) throw new Error(`Failed to revert override: ${error.message}`);
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
