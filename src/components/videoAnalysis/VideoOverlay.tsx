import { useEffect, useMemo, useRef } from 'react';
import type { BoundingBox, SkeletonKeypoint, TrajectoryPoint } from './types';
import {
  capTrajectory,
  createConfigFromMode,
  filterKeypointsForConfig,
  getPrecisionMultiplier,
  getVideoRenderPrecisionConfig,
  shouldUseSubPixelPrecision,
  type AdvancedOverlayConfig,
  type VideoRenderPrecisionConfig,
} from '../../types/videoConfig';

interface VideoOverlayProps {
  boundingBoxes: BoundingBox[];
  skeletonKeypoints: SkeletonKeypoint[];
  trajectoryPoints: TrajectoryPoint[];
  width: number;
  height: number;
  mode?: 'simplified' | 'advanced';
  advancedOverlay?: Partial<AdvancedOverlayConfig>;
  videoWidth?: number;
  videoHeight?: number;
  renderPrecision?: Partial<VideoRenderPrecisionConfig>;
}

const SKELETON_CONNECTIONS: [string, string][] = [
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
];

const LABEL_COLORS: Record<string, string> = {
  batsman: '#34d399',
  bowler: '#60a5fa',
  ball: '#fbbf24',
  fielder: '#f87171',
  umpire: '#a78bfa',
};

function getLabelColor(label: string): string {
  const lower = label.toLowerCase();
  for (const key of Object.keys(LABEL_COLORS)) {
    if (lower.includes(key)) return LABEL_COLORS[key];
  }
  return '#94a3b8';
}

export function VideoOverlay({
  boundingBoxes,
  skeletonKeypoints,
  trajectoryPoints,
  width,
  height,
  mode = 'simplified',
  advancedOverlay,
  videoWidth,
  videoHeight,
  renderPrecision,
}: VideoOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayConfig = useMemo(
    () =>
      advancedOverlay
        ? createConfigFromMode(advancedOverlay.mode ?? 'mixed', advancedOverlay)
        : null,
    [advancedOverlay]
  );
  const precisionConfig = useMemo(
    () => getVideoRenderPrecisionConfig(renderPrecision),
    [renderPrecision]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    const snapMultiplier =
      overlayConfig && videoWidth && videoHeight
        ? getPrecisionMultiplier(width, height)
        : null;
    const roundCoordinates =
      overlayConfig && videoWidth && videoHeight
        ? shouldUseSubPixelPrecision(videoWidth, videoHeight)
          ? precisionConfig.roundCoordinatesSmallVideos
          : precisionConfig.roundCoordinatesRegularVideos
        : false;
    const snap = (value: number) => {
      if (!roundCoordinates || !snapMultiplier) {
        return value;
      }
      return Math.round(value * snapMultiplier) / snapMultiplier;
    };

    const boxesToDraw = overlayConfig
      ? boundingBoxes.filter((box) => {
          const label = box.label.toLowerCase();
          const matchesBall = label.includes('ball');
          const matchesBat = label.includes('bat');
          const matchesBatsman = label.includes('batsman');
          const matchesBowler = label.includes('bowler');

          if (overlayConfig.trackingMode === 'active-bat' && !(matchesBall || matchesBat || matchesBatsman)) {
            return false;
          }
          if (overlayConfig.trackingMode === 'active-bowler' && !(matchesBall || matchesBowler)) {
            return false;
          }
          if (matchesBall) {
            return box.confidence >= overlayConfig.objectDetectionThreshold.ball;
          }
          if (matchesBat) {
            return box.confidence >= overlayConfig.objectDetectionThreshold.bat;
          }
          return box.confidence >= overlayConfig.objectDetectionThreshold.player;
        })
      : mode === 'simplified'
        ? boundingBoxes.filter((box) => {
            const label = box.label.toLowerCase();
            return label.includes('ball') || label.includes('batsman') || label.includes('bowler');
          })
        : boundingBoxes;

    for (const box of boxesToDraw) {
      const color = overlayConfig?.entityColor ?? getLabelColor(box.label);
      ctx.strokeStyle = color;
      ctx.lineWidth = overlayConfig?.lineWidth ?? 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.strokeRect(snap(box.x), snap(box.y), box.w, box.h);
      ctx.shadowBlur = 0;

      if (mode === 'advanced' && (overlayConfig?.showLabels ?? true)) {
        const alpha = Math.round(box.confidence * 255)
          .toString(16)
          .padStart(2, '0');
        ctx.fillStyle = `${color}${alpha}`;
        ctx.fillRect(snap(box.x), snap(box.y - 22), box.w, 22);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`${box.label} ${Math.round(box.confidence * 100)}%`, snap(box.x + 4), snap(box.y - 6));
      }
    }

    const keypointsToDraw = overlayConfig
      ? filterKeypointsForConfig(skeletonKeypoints, overlayConfig)
      : skeletonKeypoints;

    if (mode === 'advanced' && keypointsToDraw.length > 0) {
      const keypointMap = new Map<string, SkeletonKeypoint>();
      for (const keypoint of keypointsToDraw) {
        keypointMap.set(keypoint.label, {
          ...keypoint,
          x: snap(keypoint.x),
          y: snap(keypoint.y),
        });
      }

      ctx.strokeStyle = overlayConfig ? `${overlayConfig.entityColor}99` : '#34d39980';
      ctx.lineWidth = overlayConfig?.lineWidth ?? 2;

      for (const [a, b] of SKELETON_CONNECTIONS) {
        const kpA = keypointMap.get(a);
        const kpB = keypointMap.get(b);
        if (kpA && kpB) {
          ctx.beginPath();
          ctx.moveTo(kpA.x, kpA.y);
          ctx.lineTo(kpB.x, kpB.y);
          ctx.stroke();
        }
      }

      for (const keypoint of keypointMap.values()) {
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = overlayConfig?.entityColor ?? '#34d399';
        ctx.shadowColor = overlayConfig?.entityColor ?? '#34d399';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    const sortedTrajectory = [...trajectoryPoints].sort((a, b) => a.t - b.t);
    const trajectoryToDraw = overlayConfig
      ? capTrajectory(sortedTrajectory, overlayConfig.trajectoryPoints)
      : sortedTrajectory;

    if ((!overlayConfig || overlayConfig.trajectoryMode !== 'none') && trajectoryToDraw.length > 1) {
      ctx.beginPath();
      ctx.moveTo(snap(trajectoryToDraw[0].x), snap(trajectoryToDraw[0].y));
      for (let i = 1; i < trajectoryToDraw.length; i += 1) {
        ctx.lineTo(snap(trajectoryToDraw[i].x), snap(trajectoryToDraw[i].y));
      }

      const trajectoryColor = overlayConfig
        ? overlayConfig.trajectoryColor
        : mode === 'advanced'
          ? '#fbbf24'
          : '#fde047';
      ctx.strokeStyle = trajectoryColor;
      ctx.lineWidth = overlayConfig?.lineWidth ?? (mode === 'advanced' ? 2 : 3);
      ctx.setLineDash(
        overlayConfig
          ? overlayConfig.trajectoryMode === 'swing-arc'
            ? [6, 4]
            : []
          : mode === 'advanced'
            ? [6, 4]
            : []
      );
      ctx.shadowColor = trajectoryColor;
      ctx.shadowBlur = overlayConfig ? 10 : mode === 'advanced' ? 10 : 14;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      const last = trajectoryToDraw[trajectoryToDraw.length - 1];
      ctx.beginPath();
      ctx.arc(snap(last.x), snap(last.y), overlayConfig ? 5 : mode === 'advanced' ? 5 : 6, 0, Math.PI * 2);
      ctx.fillStyle = trajectoryColor;
      ctx.shadowColor = trajectoryColor;
      ctx.shadowBlur = overlayConfig ? 12 : mode === 'advanced' ? 12 : 18;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }, [
    boundingBoxes,
    height,
    mode,
    overlayConfig,
    precisionConfig,
    skeletonKeypoints,
    trajectoryPoints,
    videoHeight,
    videoWidth,
    width,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
}
