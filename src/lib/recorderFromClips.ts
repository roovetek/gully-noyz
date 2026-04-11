import { calculateInningsOversDisplay } from './match';
import { parseBaseRuns } from './ballCounter';

export type RecorderClipRow = {
  outcome: string;
  dismissal_type: string | null;
  over_number: number;
  ball_number: number;
  delivery_index?: number;
  innings_number: number;
  extra_runs?: number;
  is_valid_ball?: boolean;
};

export type RecorderHudFromClips = {
  totalRuns: number;
  totalWickets: number;
  currentOvers: string;
  overNumber: number;
  ballNumber: number;
  deliveryNumber: number;
  inningsComplete: boolean;
  activeOverNumber: number;
  usedDeliveries: Set<number>;
};

const emptyHud = (): RecorderHudFromClips => ({
  totalRuns: 0,
  totalWickets: 0,
  currentOvers: '0',
  overNumber: 1,
  ballNumber: 1,
  deliveryNumber: 1,
  inningsComplete: false,
  activeOverNumber: 1,
  usedDeliveries: new Set<number>(),
});

/** Derive recorder HUD fields from clips for a single innings (same rules as legacy loadMatchAndClips). */
export function deriveRecorderHudFromInningsClips(
  clips: RecorderClipRow[] | null | undefined,
  ballsPerOver: number,
  totalOvers: number
): RecorderHudFromClips {
  const bpo = ballsPerOver;
  const to = totalOvers;

  if (!clips?.length || bpo < 1) {
    return emptyHud();
  }

  const runs = clips.reduce((total, clip) => {
    const runValue = parseBaseRuns(clip.outcome);
    return total + runValue + (clip.extra_runs ?? 0);
  }, 0);

  const wickets = clips.filter(
    (clip) => clip.dismissal_type !== null || clip.outcome === 'wicket'
  ).length;

  const currentOvers = calculateInningsOversDisplay(clips, bpo);

  const maxOver = Math.max(...clips.map((clip) => clip.over_number));
  const currentOverClips = clips.filter((clip) => clip.over_number === maxOver);
  const validBallsInOver = currentOverClips.filter((clip) => clip.is_valid_ball !== false).length;
  const latestDelivery = Math.max(
    ...currentOverClips.map((clip) => clip.delivery_index ?? clip.ball_number)
  );

  let activeOverNumber = 1;
  let overNumber = 1;
  let ballNumber = 1;
  let deliveryNumber = 1;
  let inningsComplete = false;

  if (maxOver >= to && validBallsInOver >= bpo) {
    activeOverNumber = maxOver;
    inningsComplete = true;
    overNumber = maxOver;
    ballNumber = validBallsInOver;
    deliveryNumber = latestDelivery + 1;
  } else if (validBallsInOver >= bpo) {
    activeOverNumber = maxOver + 1;
    overNumber = maxOver + 1;
    ballNumber = 1;
    deliveryNumber = 1;
    inningsComplete = false;
  } else {
    activeOverNumber = maxOver;
    overNumber = maxOver;
    ballNumber = validBallsInOver + 1;
    deliveryNumber = latestDelivery + 1;
    inningsComplete = false;
  }

  const usedDeliveries = new Set(
    clips
      .filter((c) => c.over_number === activeOverNumber)
      .map((c) => c.delivery_index ?? c.ball_number)
  );

  return {
    totalRuns: runs,
    totalWickets: wickets,
    currentOvers,
    overNumber,
    ballNumber,
    deliveryNumber,
    inningsComplete,
    activeOverNumber,
    usedDeliveries,
  };
}
