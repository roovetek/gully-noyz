import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { SkeletonKeypoint } from '../types';

/** BlazePose / MediaPipe pose landmark indices used for cricket overlay (33-point model). */
const IDX = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

const VIS_MIN = 0.35;

function pickLm(lms: NormalizedLandmark[], i: number): NormalizedLandmark | null {
  const lm = lms[i];
  if (!lm || (lm.visibility ?? 1) < VIS_MIN) return null;
  return lm;
}

/**
 * Maps the first detected pose's normalized landmarks to `SkeletonKeypoint` labels
 * expected by {@link VideoOverlay} connections.
 */
export function mediapipeLandmarksToSkeleton(landmarks: NormalizedLandmark[][]): SkeletonKeypoint[] {
  const lms = landmarks[0];
  if (!lms?.length) return [];

  const out: SkeletonKeypoint[] = [];

  const add = (label: string, lm: NormalizedLandmark | null) => {
    if (!lm) return;
    out.push({ x: lm.x, y: lm.y, label });
  };

  add('head', pickLm(lms, IDX.nose));
  add('left_shoulder', pickLm(lms, IDX.leftShoulder));
  add('right_shoulder', pickLm(lms, IDX.rightShoulder));
  add('left_elbow', pickLm(lms, IDX.leftElbow));
  add('right_elbow', pickLm(lms, IDX.rightElbow));
  add('left_wrist', pickLm(lms, IDX.leftWrist));
  add('right_wrist', pickLm(lms, IDX.rightWrist));
  add('left_hip', pickLm(lms, IDX.leftHip));
  add('right_hip', pickLm(lms, IDX.rightHip));
  add('left_knee', pickLm(lms, IDX.leftKnee));
  add('right_knee', pickLm(lms, IDX.rightKnee));
  add('left_ankle', pickLm(lms, IDX.leftAnkle));
  add('right_ankle', pickLm(lms, IDX.rightAnkle));

  return out;
}
