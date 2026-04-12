import { executeTrackedAction, supabase } from './supabase';
import { userFriendlyMessage } from './userFriendlyError';

export async function completeMatch(
  matchId: string,
  resultType: 'winner' | 'tie' | 'abandoned',
  completedByRole: 'umpire',
  winner?: string,
  reason?: string
): Promise<void> {
  const status = resultType === 'abandoned' ? 'abandoned' : 'completed';

  const { error: matchError } = await executeTrackedAction({
    tableName: 'matches',
    action: 'complete_status',
    matchId,
    payload: { status, result_type: resultType },
    execute: async () =>
      supabase
        .from('matches')
        .update({
          status,
          result_type: resultType,
          winner: winner || null,
        })
        .eq('match_id', matchId),
  });

  if (matchError) {
    throw new Error(
      userFriendlyMessage(matchError, { fallback: 'Could not update match status. Please try again.' })
    );
  }

  const { error: resultError } = await executeTrackedAction({
    tableName: 'match_results',
    action: 'insert',
    matchId,
    payload: { status: resultType === 'tie' ? 'tie' : status, completed_by_role: completedByRole },
    execute: async () =>
      supabase.from('match_results').insert({
        match_id: matchId,
        status: resultType === 'tie' ? 'tie' : status,
        winner: winner || null,
        completion_reason: reason || `Match ${resultType}`,
        completed_by_role: completedByRole,
      }),
  });

  if (resultError) {
    throw new Error(
      userFriendlyMessage(resultError, { fallback: 'Could not save match result. Please try again.' })
    );
  }
}

export async function abandonMatch(
  matchId: string,
  reason: string,
  abandonedByRole: 'umpire'
): Promise<void> {
  await completeMatch(matchId, 'abandoned', abandonedByRole, undefined, reason);
}

export async function calculateWinner(matchId: string): Promise<{ winner: string | null; reason: string }> {
  const { data: clips, error } = await supabase
    .from('clips')
    .select('*')
    .eq('match_id', matchId)
    .order('innings', { ascending: true });

  if (error || !clips) {
    return { winner: null, reason: 'Unable to calculate winner' };
  }

  const innings1Clips = clips.filter(c => c.innings === 1);
  const innings2Clips = clips.filter(c => c.innings === 2);

  const innings1Runs = innings1Clips.reduce((sum, c) => sum + c.runs + c.extra_runs, 0);
  const innings2Runs = innings2Clips.reduce((sum, c) => sum + c.runs + c.extra_runs, 0);

  const { data: match } = await supabase
    .from('matches')
    .select('name')
    .eq('match_id', matchId)
    .maybeSingle();

  const teamNames = match?.name?.split(' vs ') || ['Team A', 'Team B'];

  if (innings2Runs > innings1Runs) {
    return {
      winner: teamNames[1],
      reason: `${teamNames[1]} won by ${innings2Runs - innings1Runs} runs`
    };
  } else if (innings1Runs > innings2Runs) {
    return {
      winner: teamNames[0],
      reason: `${teamNames[0]} won by ${innings1Runs - innings2Runs} runs`
    };
  } else {
    return { winner: null, reason: 'Match tied' };
  }
}

export async function deleteLastBall(matchId: string, innings: number): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from('clips')
    .select('*')
    .eq('match_id', matchId)
    .eq('innings', innings)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError || !data) {
    throw new Error('No balls to delete');
  }

  const { error: deleteError } = await executeTrackedAction({
    tableName: 'clips',
    action: 'delete_last_ball',
    matchId,
    payload: { clip_id: data.id, innings },
    execute: async () => supabase.from('clips').delete().eq('id', data.id),
  });

  if (deleteError) {
    throw new Error(
      userFriendlyMessage(deleteError, { fallback: 'Could not delete ball. Please try again.' })
    );
  }
}
