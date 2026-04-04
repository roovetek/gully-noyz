import { BallOutcome, MatchRules } from './types';

export function isValidBall(outcome: BallOutcome, rules: MatchRules): boolean {
  if (outcome === 'wide' && rules.wide_no_ball_count) {
    return false;
  }

  if (outcome === 'noball') {
    return false;
  }

  return true;
}

export function calculateRuns(
  outcome: BallOutcome,
  baseRuns: number,
  extraRuns: number,
  rules: MatchRules
): { totalRuns: number; effectiveExtraRuns: number } {
  let effectiveExtraRuns = extraRuns;

  if (outcome === 'wide' && rules.wide_no_runs) {
    effectiveExtraRuns = 0;
  }

  if (outcome === 'legbye' && rules.legbye_no_runs) {
    effectiveExtraRuns = 0;
  }

  const totalRuns = baseRuns + effectiveExtraRuns;

  return { totalRuns, effectiveExtraRuns };
}

export function getOverBallDisplay(validBallCount: number, ballsPerOver: number): string {
  const completedOvers = Math.floor(validBallCount / ballsPerOver);
  const ballsInCurrentOver = validBallCount % ballsPerOver;
  return `${completedOvers}.${ballsInCurrentOver}`;
}

export function calculateOverNumber(validBallCount: number, ballsPerOver: number): number {
  return Math.floor(validBallCount / ballsPerOver);
}

export function calculateBallInOver(validBallCount: number, ballsPerOver: number): number {
  return (validBallCount % ballsPerOver) + 1;
}
