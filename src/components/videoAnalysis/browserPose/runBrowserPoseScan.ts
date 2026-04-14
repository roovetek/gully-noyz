import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { SkeletonKeypoint } from '../types';
import { mediapipeLandmarksToSkeleton } from './mediapipeLandmarksToSkeleton';

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

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

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const wasm = await FilesetResolver.forVisionTasks(WASM_CDN);
      try {
        return await PoseLandmarker.createFromOptions(wasm, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.4,
          minPosePresenceConfidence: 0.4,
          minTrackingConfidence: 0.4,
        });
      } catch {
        return PoseLandmarker.createFromOptions(wasm, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.4,
          minPosePresenceConfidence: 0.4,
          minTrackingConfidence: 0.4,
        });
      }
    })();
  }
  return landmarkerPromise;
}

/**
 * Seeks through `video`, runs MediaPipe Pose Landmarker per sampled frame, returns normalized keypoints.
 * Restores `video.currentTime` after completion. Pauses playback if needed.
 */
export async function runBrowserPoseScan(params: RunBrowserPoseScanParams): Promise<BrowserPoseFrame[]> {
  const { video, canvas, stepSec = 0.1, maxProcessWidth = 480, onProgress } = params;

  if (!video.videoWidth || !video.duration || Number.isNaN(video.duration)) {
    throw new Error('Video metadata not loaded');
  }

  const wasPaused = video.paused;
  const prevTime = video.currentTime;
  video.pause();

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const scale = Math.min(1, maxProcessWidth / vw);
  canvas.width = Math.max(1, Math.round(vw * scale));
  canvas.height = Math.max(1, Math.round(vh * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const landmarker = await getPoseLandmarker();
  const frames: BrowserPoseFrame[] = [];
  const duration = video.duration;
  const times: number[] = [];
  for (let t = 0; t < duration; t += stepSec) {
    times.push(t);
  }
  if (times.length === 0 || times[times.length - 1] < duration - 1e-3) {
    times.push(duration - 1e-3);
  }

  let lastTs = -1;
  for (let i = 0; i < times.length; i += 1) {
    const t = times[i];
    await seekVideo(video, t);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const timestampMs = Math.max(lastTs + 1, Math.round(t * 1000));
    lastTs = timestampMs;
    const result = landmarker.detectForVideo(canvas, timestampMs);
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
