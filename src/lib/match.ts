import { generateSecureMatchId } from './security';
import { parseBaseRuns } from './ballCounter';

export interface MatchConfig {
  matchId: string;
  name: string;
  isPrivate: boolean;
  totalOvers: number;
  ballsPerOver: number;
  secretHash?: string;
}

export interface BallIdentifier {
  overNumber: number;
  ballNumber: number;
  inningsNumber: number;
}

export interface MatchStats {
  totalRuns: number;
  totalWickets: number;
  currentOvers: string;
}

export function generateMatchId(): string {
  return generateSecureMatchId();
}

export function calculateOversDisplay(
  completedBalls: number,
  ballsPerOver: number
): string {
  const completedOvers = Math.floor(completedBalls / ballsPerOver);
  const remainingBalls = completedBalls % ballsPerOver;

  if (remainingBalls === 0) {
    return completedOvers.toString();
  }

  return `${completedOvers}.${remainingBalls}`;
}

export function getNextBall(
  currentOver: number,
  currentBall: number,
  ballsPerOver: number,
  totalOvers: number,
  currentInnings: number
): {
  overNumber: number;
  ballNumber: number;
  inningsNumber: number;
  isInningsComplete: boolean;
  isMatchComplete: boolean;
} {
  const nextBall = currentBall + 1;

  if (nextBall > ballsPerOver) {
    const nextOver = currentOver + 1;

    if (nextOver > totalOvers) {
      if (currentInnings === 1) {
        return {
          overNumber: 1,
          ballNumber: 1,
          inningsNumber: 2,
          isInningsComplete: true,
          isMatchComplete: false,
        };
      } else {
        return {
          overNumber: currentOver,
          ballNumber: currentBall,
          inningsNumber: currentInnings,
          isInningsComplete: true,
          isMatchComplete: true,
        };
      }
    }

    return {
      overNumber: nextOver,
      ballNumber: 1,
      inningsNumber: currentInnings,
      isInningsComplete: false,
      isMatchComplete: false,
    };
  }

  return {
    overNumber: currentOver,
    ballNumber: nextBall,
    inningsNumber: currentInnings,
    isInningsComplete: false,
    isMatchComplete: false,
  };
}

/** Cricket-style overs for one innings (e.g. 1.3 = 1 over + 3 balls). Matches MatchStats / Record logic. */
export function calculateInningsOversDisplay(
  clips: Array<{ is_valid_ball?: boolean }>,
  ballsPerOver: number
): string {
  if (!clips.length || ballsPerOver < 1) {
    return '0';
  }
  const validBallCount = clips.filter((c) => c.is_valid_ball !== false).length;
  const completedOvers = Math.floor(validBallCount / ballsPerOver);
  const remainingBalls = validBallCount % ballsPerOver;
  return remainingBalls === 0 ? completedOvers.toString() : `${completedOvers}.${remainingBalls}`;
}

export function calculateMatchStats(
  clips: Array<{ outcome: string; extra_runs?: number; dismissal_type?: string | null; is_valid_ball?: boolean }>,
  ballsPerOver: number
): MatchStats {
  const runs = clips.reduce((total, clip) => {
    const runValue = parseBaseRuns(clip.outcome);
    return total + runValue + (clip.extra_runs ?? 0);
  }, 0);

  const wickets = clips.filter(
    (clip) => clip.outcome === 'wicket' || clip.dismissal_type != null
  ).length;

  const currentOvers = calculateInningsOversDisplay(clips, ballsPerOver);

  return {
    totalRuns: runs,
    totalWickets: wickets,
    currentOvers,
  };
}

export function formatBallIdentifier(ball: BallIdentifier): string {
  return `Innings ${ball.inningsNumber} - Over ${ball.overNumber}, Ball ${ball.ballNumber}`;
}

export function isBallAlreadyRecorded(
  usedBalls: Set<number>,
  ballNumber: number
): boolean {
  return usedBalls.has(ballNumber);
}
