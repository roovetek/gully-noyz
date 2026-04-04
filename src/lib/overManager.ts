import { supabase } from './supabase';
import { MatchRules } from './types';

export async function isOverComplete(
  matchId: string,
  innings: number,
  overNumber: number,
  rules: MatchRules
): Promise<boolean> {
  const { data, error } = await supabase
    .from('clips')
    .select('*')
    .eq('match_id', matchId)
    .eq('innings', innings)
    .eq('over_number', overNumber)
    .eq('is_valid_ball', true);

  if (error || !data) return false;

  return data.length >= rules.balls_per_over;
}

export async function canStartNewOver(
  matchId: string,
  innings: number,
  rules: MatchRules
): Promise<{ allowed: boolean; reason?: string }> {
  const currentOver = await getCurrentOver(matchId, innings);

  const overComplete = await isOverComplete(matchId, innings, currentOver, rules);

  if (!overComplete) {
    return { allowed: false, reason: 'Current over is not complete' };
  }

  const totalOvers = currentOver + 1;
  if (totalOvers >= rules.overs_per_innings) {
    return { allowed: false, reason: 'Innings complete: Maximum overs reached' };
  }

  return { allowed: true };
}

export async function getCurrentOver(matchId: string, innings: number): Promise<number> {
  const { data, error } = await supabase
    .from('clips')
    .select('over_number')
    .eq('match_id', matchId)
    .eq('innings', innings)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return 0;
  return data.over_number;
}

export async function getTotalValidBalls(matchId: string, innings: number): Promise<number> {
  const { data, error } = await supabase
    .from('clips')
    .select('*')
    .eq('match_id', matchId)
    .eq('innings', innings)
    .eq('is_valid_ball', true);

  if (error || !data) return 0;
  return data.length;
}
