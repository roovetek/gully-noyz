import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { SkeletonKeypoint } from '../types';
import { mediapipeLandmarksToSkeleton } from './mediapipeLandmarksToSkeleton';

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

export const BROWSER_POSE_SCAN_DEFAULTS = {
  stepSec: 0.12,
  maxProcessWidth: 480,
  runningMode: 'IMAGE',
  numPoses: 1,
  minPoseDetectionConfidence: 0.4,
  minPosePresenceConfidence: 0.4,
  minTrackingConfidence: 0.4,
  modelVariant: 'pose_landmarker_lite',
} as const;

/** Options passed to MediaPipe PoseLandmarker.createFromOptions (cached per unique combination). */
export type BrowserPoseLandmarkerOptions = {
  numPoses: number;
  minPoseDetectionConfidence: number;
  minPosePresenceConfidence: number;
  minTrackingConfidence: number;
};

export function defaultBrowserPoseLandmarkerOptions(): BrowserPoseLandmarkerOptions {
  return {
    numPoses: BROWSER_POSE_SCAN_DEFAULTS.numPoses,
    minPoseDetectionConfidence: BROWSER_POSE_SCAN_DEFAULTS.minPoseDetectionConfidence,
    minPosePresenceConfidence: BROWSER_POSE_SCAN_DEFAULTS.minPosePresenceConfidence,
    minTrackingConfidence: BROWSER_POSE_SCAN_DEFAULTS.minTrackingConfidence,
  };
}

export interface BrowserPoseFrame {
  /** Media time in seconds. */
  timeSec: number;
  /** Normalized [0,1] x/y in source video frame space (matches `HTMLVideoElement` frame). */
  keypointsNorm: SkeletonKeypoint[];
}

export interface RunBrowserPoseScanParams {
  video: HTMLVideoElement;
  /** Offscreen canvas; width/height should match scaled processing size. */
  canvas: HTMLCanvasElement;
  /** Seconds between samples (larger = faster scan, coarser timeline). */
  stepSec?: number;
  /** Max width for processing; height follows video aspect. */
  maxProcessWidth?: number;
  onProgress?: (fraction: number) => void;
  /** MediaPipe landmarker options; defaults from BROWSER_POSE_SCAN_DEFAULTS. */
  poseLandmarker?: Partial<BrowserPoseLandmarkerOptions>;
}

function seekVideo(video: HTMLVideoElement, timeSec: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = Math.max(0, Math.min(timeSec, Math.max(0, video.duration - 1e-4)));
    if (Number.isNaN(t)) {
      reject(new Error('Invalid video duration'));
      return;
    }
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      resolve();
    };
    const onError = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      reject(new Error('Video seek failed'));
    };
    video.addEventListener('seeked', onSeeked, { once: true });
    video.addEventListener('error', onError, { once: true });
    video.currentTime = t;
  });
}

const landmarkerCache = new Map<string, Promise<PoseLandmarker>>();

function landmarkerCacheKey(opts: BrowserPoseLandmarkerOptions): string {
  return [
    opts.numPoses,
    opts.minPoseDetectionConfidence,
    opts.minPosePresenceConfidence,
    opts.minTrackingConfidence,
  ].join('|');
}

function mergeLandmarkerOptions(partial?: Partial<BrowserPoseLandmarkerOptions>): BrowserPoseLandmarkerOptions {
  const d = defaultBrowserPoseLandmarkerOptions();
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  const numPoses = Math.min(4, Math.max(1, Math.round(partial?.numPoses ?? d.numPoses)));
  return {
    numPoses,
    minPoseDetectionConfidence: clamp01(partial?.minPoseDetectionConfidence ?? d.minPoseDetectionConfidence),
    minPosePresenceConfidence: clamp01(partial?.minPosePresenceConfidence ?? d.minPosePresenceConfidence),
    minTrackingConfidence: clamp01(partial?.minTrackingConfidence ?? d.minTrackingConfidence),
  };
}

/**
 * IMAGE mode: each frame is independent. VIDEO mode keeps graph timestamp state and
 * requires monotonically increasing timestamps for the lifetime of the instance — a
 * second scan (or new clip) that restarts near 0 triggers "Packet timestamp mismatch".
 */
async function getPoseLandmarker(opts: BrowserPoseLandmarkerOptions): Promise<PoseLandmarker> {
  const key = landmarkerCacheKey(opts);
  let landmarkerPromise = landmarkerCache.get(key);
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const wasm = await FilesetResolver.forVisionTasks(WASM_CDN);
      const options = {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'GPU' as const,
        },
        runningMode: 'IMAGE' as const,
        numPoses: opts.numPoses,
        minPoseDetectionConfidence: opts.minPoseDetectionConfidence,
        minPosePresenceConfidence: opts.minPosePresenceConfidence,
        minTrackingConfidence: opts.minTrackingConfidence,
      };
      try {
        return await PoseLandmarker.createFromOptions(wasm, options);
      } catch {
        return PoseLandmarker.createFromOptions(wasm, {
          ...options,
          baseOptions: { ...options.baseOptions, delegate: 'CPU' },
        });
      }
    })();
    landmarkerCache.set(key, landmarkerPromise);
  }
  return landmarkerPromise;
}

/**
 * Seeks through `video`, runs MediaPipe Pose Landmarker per sampled frame, returns normalized keypoints.
 * Restores `video.currentTime` after completion. Pauses playback if needed.
 */
export async function runBrowserPoseScan(params: RunBrowserPoseScanParams): Promise<BrowserPoseFrame[]> {
  const {
    video,
    canvas,
    stepSec = BROWSER_POSE_SCAN_DEFAULTS.stepSec,
    maxProcessWidth = BROWSER_POSE_SCAN_DEFAULTS.maxProcessWidth,
    onProgress,
    poseLandmarker: poseLandmarkerPartial,
  } = params;
  const lmOpts = mergeLandmarkerOptions(poseLandmarkerPartial);
  const stepSecClamped = Math.min(2, Math.max(0.02, stepSec));
  const maxProcessWidthClamped = Math.min(1920, Math.max(64, Math.round(maxProcessWidth)));

  if (!video.videoWidth || !video.duration || Number.isNaN(video.duration)) {
    throw new Error('Video metadata not loaded');
  }

  const wasPaused = video.paused;
  const prevTime = video.currentTime;
  video.pause();

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const scale = Math.min(1, maxProcessWidthClamped / vw);
  canvas.width = Math.max(1, Math.round(vw * scale));
  canvas.height = Math.max(1, Math.round(vh * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const landmarker = await getPoseLandmarker(lmOpts);
  const frames: BrowserPoseFrame[] = [];
  const duration = video.duration;
  const times: number[] = [];
  for (let t = 0; t < duration; t += stepSecClamped) {
    times.push(t);
  }
  if (times.length === 0 || times[times.length - 1] < duration - 1e-3) {
    times.push(duration - 1e-3);
  }

  for (let i = 0; i < times.length; i += 1) {
    const t = times[i];
    await seekVideo(video, t);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const result = landmarker.detect(canvas);
    const keypointsNorm = mediapipeLandmarksToSkeleton(result.landmarks);
    frames.push({ timeSec: t, keypointsNorm });
    onProgress?.((i + 1) / times.length);
    result.close();
  }

  await seekVideo(video, prevTime);
  if (!wasPaused) {
    void video.play().catch(() => {
      /* user gesture may be required */
    });
  }

  return frames;
}
