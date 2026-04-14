import { describe, expect, it } from 'vitest';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { mediapipeLandmarksToSkeleton } from '../../src/components/videoAnalysis/browserPose/mediapipeLandmarksToSkeleton';

function lm(x: number, y: number, visibility = 1): NormalizedLandmark {
  return { x, y, z: 0, visibility };
}

describe('mediapipeLandmarksToSkeleton', () => {
  it('maps BlazePose indices to VideoOverlay skeleton labels', () => {
    const landmarks: NormalizedLandmark[] = Array.from({ length: 33 }, () => lm(0, 0, 0));
    landmarks[0] = lm(0.52, 0.08);
    landmarks[11] = lm(0.42, 0.18);
    landmarks[12] = lm(0.62, 0.19);
    landmarks[13] = lm(0.38, 0.28);
    landmarks[14] = lm(0.66, 0.29);
    landmarks[15] = lm(0.35, 0.38);
    landmarks[16] = lm(0.7, 0.36);
    landmarks[23] = lm(0.45, 0.55);
    landmarks[24] = lm(0.58, 0.54);
    landmarks[25] = lm(0.44, 0.72);
    landmarks[26] = lm(0.6, 0.7);
    landmarks[27] = lm(0.43, 0.92);
    landmarks[28] = lm(0.59, 0.91);

    const sk = mediapipeLandmarksToSkeleton([landmarks]);
    const labels = new Set(sk.map((k) => k.label));
    expect(labels.has('head')).toBe(true);
    expect(labels.has('left_wrist')).toBe(true);
    expect(labels.has('right_ankle')).toBe(true);
    expect(sk.find((k) => k.label === 'head')?.x).toBeCloseTo(0.52);
  });

  it('returns empty when no poses detected', () => {
    expect(mediapipeLandmarksToSkeleton([])).toEqual([]);
  });
});
