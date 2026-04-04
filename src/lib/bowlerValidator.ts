import { supabase } from './supabase';
import { BowlerStats, MatchRules } from './types';

export async function canBowl(
  matchId: string,
  bowlerName: string,
  innings: number,
  currentOverNumber: number,
  rules: MatchRules
): Promise<{ allowed: boolean; reason?: string }> {
  const overLimitCheck = await checkBowlerOverLimit(matchId, bowlerName, innings, rules);
  if (!overLimitCheck.allowed) {
    return overLimitCheck;
  }

  if (rules.consecutive_overs_required) {
    const consecutiveCheck = await validateConsecutiveOvers(matchId, bowlerName, innings, currentOverNumber);
    if (!consecutiveCheck.allowed) {
      return consecutiveCheck;
    }
  }

  return { allowed: true };
}

export async function getBowlerStats(
  matchId: string,
  bowlerName: string,
  innings: number
): Promise<BowlerStats> {
  const { data, error } = await supabase
    .from('clips')
    .select('*')
    .eq('match_id', matchId)
    .eq('innings', innings)
    .eq('bowler_name', bowlerName);

  if (error || !data) {
    return { name: bowlerName, overs: 0, balls: 0, runs: 0, wickets: 0, economy: 0 };
  }

  const validBalls = data.filter(c => c.is_valid_ball).length;
  const completedOvers = Math.floor(validBalls / 6);
  const extraBalls = validBalls % 6;
  const totalRuns = data.reduce((sum, c) => sum + c.runs + c.extra_runs, 0);
  const wickets = data.filter(c => c.wicket).length;

  const overs = completedOvers + (extraBalls / 10);
  const economy = overs > 0 ? totalRuns / overs : 0;

  return {
    name: bowlerName,
    overs: completedOvers,
    balls: extraBalls,
    runs: totalRuns,
    wickets,
    economy: parseFloat(economy.toFixed(2)),
  };
}

export async function checkBowlerOverLimit(
  matchId: string,
  bowlerName: string,
  innings: number,
  rules: MatchRules
): Promise<{ allowed: boolean; reason?: string }> {
  const stats = await getBowlerStats(matchId, bowlerName, innings);

  const totalOvers = stats.overs + (stats.balls > 0 ? 1 : 0);

  if (totalOvers >= rules.max_overs_per_bowler) {
    return {
      allowed: false,
      reason: `Bowler has reached maximum overs (${rules.max_overs_per_bowler})`,
    };
  }

  return { allowed: true };
}

export async function validateConsecutiveOvers(
  matchId: string,
  bowlerName: string,
  innings: number,
  currentOverNumber: number
): Promise<{ allowed: boolean; reason?: string }> {
  if (currentOverNumber === 0) {
    return { allowed: true };
  }

  if (currentOverNumber % 2 === 0) {
    return { allowed: true };
  }

  const { data, error } = await supabase
    .from('clips')
    .select('bowler_name')
    .eq('match_id', matchId)
    .eq('innings', innings)
    .eq('over_number', currentOverNumber - 1)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { allowed: true };
  }

  if (data.bowler_name !== bowlerName) {
    return {
      allowed: false,
      reason: 'Consecutive overs required: Must use same bowler from previous over',
    };
  }

  return { allowed: true };
}

export async function getAllBowlerStats(matchId: string, innings: number): Promise<BowlerStats[]> {
  const { data, error } = await supabase
    .from('clips')
    .select('bowler_name')
    .eq('match_id', matchId)
    .eq('innings', innings)
    .not('bowler_name', 'is', null);

  if (error || !data) return [];

  const uniqueBowlers = [...new Set(data.map(c => c.bowler_name))];

  const statsPromises = uniqueBowlers.map(bowler =>
    getBowlerStats(matchId, bowler as string, innings)
  );

  return Promise.all(statsPromises);
}
