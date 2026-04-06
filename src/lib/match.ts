import { generateSecureMatchId } from './security';

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
  clips: Array<{ over_number: number }>,
  ballsPerOver: number
): string {
  if (!clips.length || ballsPerOver < 1) {
    return '0';
  }
  const uniqueOvers = new Set(clips.map((c) => c.over_number));
  const maxOver = Math.max(...Array.from(uniqueOvers));
  const ballsInLastOver = clips.filter((c) => c.over_number === maxOver).length;
  const completedOvers = ballsInLastOver === ballsPerOver ? maxOver : maxOver - 1;
  const remainingBalls = ballsInLastOver === ballsPerOver ? 0 : ballsInLastOver;
  return remainingBalls === 0 ? completedOvers.toString() : `${completedOvers}.${remainingBalls}`;
}

export function calculateMatchStats(
  clips: Array<{ outcome: string; dismissal_type?: string | null; over_number: number }>,
  ballsPerOver: number
): MatchStats {
  const runs = clips.reduce((total, clip) => {
    const runValue = parseInt(clip.outcome);
    return total + (isNaN(runValue) ? 0 : runValue);
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
