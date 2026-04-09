import { ExtraType, type Ball } from './types';

export interface ClipWindowInput {
  ball_start_time_ms: number;
  clip_start_time_ms: number;
  clip_end_time_ms: number;
}

export interface ClipWindow {
  trim_start_ms: number;
  trim_end_ms: number;
}

/**
 * Calculates trim offsets relative to the ball start timestamp.
 */
export function calculateClipWindow(input: ClipWindowInput): ClipWindow {
  const trim_start_ms = Math.max(0, input.clip_start_time_ms - input.ball_start_time_ms);
  const trim_end_ms = Math.max(trim_start_ms, input.clip_end_time_ms - input.ball_start_time_ms);
  return { trim_start_ms, trim_end_ms };
}

function isBoundary(ball: Ball): boolean {
  return ball.runs_batter === 4 || ball.runs_batter === 6;
}

function isCloseCall(ball: Ball): boolean {
  const transcript = ball.metadata.transcript?.toLowerCase() ?? '';
  if (transcript.includes('close') || transcript.includes('appeal')) return true;
  return ball.metadata.voice_intent_confidence !== null && ball.metadata.voice_intent_confidence < 0.45;
}

export function getHighlightReel(matchId: string, ledger: Ball[]): Ball[] {
  return ledger.filter((ball) => {
    if (ball.match_id !== matchId) return false;
    if (ball.metadata.is_highlight) return true;
    if (ball.wicket_counts && ball.wicket_type) return true;
    if (isBoundary(ball)) return true;
    if (ball.extra_type === ExtraType.NoBall && ball.wicket_type) return true;
    return isCloseCall(ball);
  });
}

